# injective_pass → Solana 迁移架构（SNS 子域 + 代付 + 入门级 UX）

本文档定义将当前 Injective 项目迁移到 Solana 的整体方案，聚焦以下目标：
- 身份：采用“品牌主域 + 子域”的 Solana Name Service（SNS, .sol）方案，减少自研域名系统维护成本，同时保留品牌力。
- 体验：用户无需理解 Gas/钱包；我们自动创建钱包，并通过代付 Relayer 承担交易费用；可选法币入金降低上手门槛。
- 功能：重构 NFC 注册与抽奖为 Solana Program（Anchor），NFT 使用 Metaplex 生态（含 cNFT）以降低成本并提升扩展性。


## 1. 总体架构概览

组件与职责
- 前端 App（Web/移动）：
  - 引导新用户创建“托管/MPC 钱包”或使用现有 Solana 钱包
  - 通过后端 Relayer 完成“免 Gas”的交易提交
  - 展示 .sol 子域身份、NFT、抽奖进度
- 代付 Relayer 服务（后端，NestJS 可复用）：
  - 接收来自前端的部分签名交易或业务请求
  - 注入 feePayer、ComputeBudget、签名并广播；队列化、重试、风控
  - 账务与限额管理，支持法币入金对接（USDC/SOL 补贴）
- 索引与可观测性：
  - 订阅 Program 日志/账户变更（RPC/WebSocket/第三方 indexer）
  - 业务事件入库（Prisma），用于前端展示与运营分析
- Solana Programs（Anchor）：
  - NFC Registry Program：标签注册/转移/禁用，链上可选 ed25519 验签
  - Social Draw Program：抽奖票据、VRF 请求/回调结算
  - 可选 Name Binding Program（轻量）：将 SNS 子域与业务身份强绑定（如需不可转/冻结）
- 第三方生态：
  - SNS（Bonfida .sol）：品牌主域 + 子域
  - Metaplex（Token Metadata、Token 2022、cNFT）：NFT 铸造与元数据
  - VRF（Switchboard）：随机数服务
  - 法币 Onramp（Stripe/MoonPay/Transak/Ramp/Helio 等）：资金入口


## 2. 域名策略：品牌主域 + 子域（推荐）

目标
- 统一品牌身份（如 mybrand.sol）
- 为每位用户分配子域（alice.mybrand.sol），被钱包与区块浏览器识别

实现要点
- 预留/购买品牌主域 mybrand.sol
- 后端提供“申请子域”API：
  - 校验用户身份（会话/手机号/邮箱/设备指纹/验证码）
  - 由后端（或托管的品牌 authority）在 SNS 上创建子域并指向用户钱包地址
- 权限与回收：
  - 子域 owner 默认用户，但可配置“冻结/解绑定”流程（例如通过 Name Binding Program 强制业务真相）
- 前端解析展示：
  - 优先显示 .sol 名；反向解析用于联系人/排名/社区展示

可选：轻量 Name Binding Program
- 目的：实现“业务不可转/冻结”等强约束，与 SNS 双写
- 账户：BindingAccount(seed=["bind", name_hash]) → { owner, status, metadata }
- 只在确有强约束时启用，避免重复造轮子


## 3. Program 设计与账户模型（Anchor）

### 3.1 NFC Registry Program
- 账户
  - TagAccount (PDA: ["tag", tag_hash]):
    - owner: Pubkey（用户钱包）
    - tag_hash: [u8; 32]（NFC 标签唯一标识或公钥哈希）
    - status: u8（0=active,1=deactivated,...）
    - created_at: i64（slot/ts）
    - metadata: 可选变长引用（建议链下存储 + 链上指针/哈希）
- 指令
  - register_tag(tag_hash, owner)
  - transfer_tag(tag_hash, new_owner)
  - deactivate_tag(tag_hash)
  - verify_and_register(tag_pubkey, signature, payload)（可选）
    - 使用 ed25519 程序在交易中附带验签指令，Program 读取 instruction sysvar 验证
- 安全
  - PDA 种子固定前缀 + bump 校验
  - 严格 signer 校验（owner/authority）
  - 防扩容：账户大小固定，扩展采用新账户+迁移策略

### 3.2 Social Draw Program（VRF）
- 账户
  - DrawPool (PDA: ["pool", pool_id]): 参数、状态、authority、vrf 配置
  - DrawTicket (PDA: ["ticket", pool, user, nonce]): 购票记录/份额
- 指令
  - create_pool(params)
  - buy_ticket(pool, amount)
  - request_randomness(pool)
  - fulfill_randomness(callback with proof) → 结算/发奖（CPI 到 Metaplex 或自定义奖励逻辑）
- 随机数
  - Switchboard VRF（Devnet/Mainnet 可用），只接受合法回调（验证证明/authority）
- 费用优化
  - cNFT 作为奖励（压缩成本），或发放代币积分（Token-2022 附加规则）

### 3.3 NFT 集成（Metaplex）
- 单品级：Metaplex Token Metadata Program 铸造标准 NFT
- 海量发放：压缩 NFT（cNFT + Bubblegum + Merkle 验证）
- 元数据：on-chain pointer + off-chain JSON（Arweave/IPFS/自建）


## 4. 代付/免 Gas 与钱包体系

### 4.1 钱包创建策略
- 方案 A：托管钱包（后端持有私钥，HSM/KMS/分权审批）
  - 优点：最简单的“0 门槛”，与代付协作自然
  - 风险：合规/风控要求高，需严格密钥管理与出金审批
- 方案 B：MPC/Passkey（WebAuthn）
  - 优点：弱托管或无托管体验，用户以生物特征/设备安全模块参与签名
  - 复杂度：集成成本较高，需选型稳定供应商/开源方案

推荐：MVP 采用“托管钱包 + 严格风控 + 限额”，后续切换 MPC/Passkey 以提升自主管理与合规性。

### 4.2 代付 Relayer 架构
- 输入：
  - 业务级 API（如 register_tag、buy_ticket）或前端构造的部分签名交易（用户/会话签名）
- 处理：
  - 校验业务参数与签名；风控（限频、黑名单、设备指纹、验证码）
  - 注入 feePayer、公平/优先费策略（ComputeBudgetInstruction）
  - 补充必要 lamports 作为账户租金（rent-exempt），或使用代付账户承担
  - 签名并广播，记录 txid
- 反滥用：
  - 授权令牌（短期会话/一次性 nonce）
  - 额度管理与冷却时间；异常触发二次验证
  - 重放防护（业务 idempotency key + on-chain nonce）
- 账务：
  - 每用户/每产品维度统计代付成本，结合法币入金/活动预算

### 4.3 法币入金
- 集成任一合规 Onramp（Stripe/MoonPay/Transak/Ramp/Helio 等）
- 策略：
  - 初期完全免 Gas（代付端承担），用户可选入金 USDC 提升账户权益
  - 或设置“首笔免 Gas + 后续任务得代付额度”的增长型机制


## 5. 关键业务流程（时序）

1) 新用户入门
- 前端创建托管钱包（或 MPC 会话）→ 后端登记用户与钱包地址
- 后端为用户申请子域：username.mybrand.sol（SNS），指向其钱包
- 返回展示：.sol 名称、欢迎 NFT/积分（可选）

2) 绑定 NFC 标签
- 前端读取标签标识/签名（如有）
- 发起 register_tag（可带 ed25519 验签）→ Relayer 代付提交
- 链上创建 TagAccount，状态 active；前端展示绑定成功

3) 参与抽奖
- 前端发起 buy_ticket → Relayer 提交
- 用户/系统请求 VRF → fulfill 回调 → 结算并发放奖励（NFT/cNFT/积分）
- 前端订阅账户/日志刷新中奖结果

4) 域名与身份变更
- 用户可申请变更/回收子域（根据策略）
- 如果采用 Name Binding Program，需同步修改 BindingAccount 状态


## 6. 数据与索引

- 不依赖 EVM 事件；采用：
  - Program 日志与账户订阅（WebSocket）
  - 关键账户（TagAccount/DrawPool/DrawTicket）变更监听
  - 必要时接入第三方 Indexer（Helius 等）以简化解析
- 后端入库（Prisma）：
  - 用户表、钱包表、子域表（SNS 同步）、NFC 标签表、抽奖订单与结果表、代付成本表


## 7. 安全与合规

- Program 层：
  - 全量 seeds 固定前缀，检查 bump
  - 严格 Signer/Authority 校验；CPI 目标白名单
  - VRF 回调来源证明校验；时间/状态机一致性（防重复结算）
- Relayer 层：
  - KMS/HSM 管理 feePayer 与托管钱包；冷热分离、阈值审批
  - 限速、风控、审计日志；异常检测与自动熔断
  - 账户租金与余额巡检；异常自动补充或报警
- 合规：
  - 视地区合规要求，Onramp/KYC/AML 流程与条款提示


## 8. 迁移映射（Injective → Solana）

- INJDomainNFT.sol → SNS 子域 +（可选）Name Binding Program（轻量）
- NFCWalletRegistry.sol → NFC Registry Program（PDA 存储）
- CatNFT_SocialDraw.sol → Social Draw Program + Switchboard VRF + Metaplex NFT/cNFT
- 后端 ethers.js → @solana/web3.js + @coral-xyz/anchor 客户端；增设 Relayer 代付与索引模块
- 前端 ABI 调用 → Anchor IDL/Metaplex SDK；Solana Wallet Adapter（或托管/MPC 会话）


## 9. 分阶段计划与验收

阶段 1（1-2 周）：PoC
- Anchor 工作区初始化，完成 NFC Registry 最小闭环（register/transfer/deactivate）
- 集成 Switchboard VRF，跑通单池抽奖 request → fulfill → 发放奖励
- 后端 Relayer 骨架：代付、限频、重试、日志
- SNS：品牌主域就绪，API 下发子域
- 前端：端到端 Demo（子域领取 → 标签绑定 → 购票 → 开奖）

阶段 2（2-3 周）：可用版本
- cNFT 发放、列表/过滤；索引与可观测性完善
- 法币入金最小接入（单一供应商）
- 风控策略上线（额度、黑白名单、二次验证）

阶段 3（2-3 周）：优化与发布
- 计算预算与优先费参数化；Address Lookup Tables（LUT）
- 稳定性/压力测试；安全审计清单完成
- Devnet → Mainnet 发布与回滚预案

验收标准（示例）
- 95%+ 用户在 3 步内完成入门（领子域/绑定/参与一次交互）
- 平均交易确认 < 2s（含优先费策略）
- 代付成本/DAU 受控在预算内；代付滥用率可控（< 阈值）


## 10. 技术选型与依赖

- Solana 1.18+，交易 v0 + ComputeBudget + LUT
- Anchor 最新稳定版；@solana/web3.js；@coral-xyz/anchor
- Metaplex（Token Metadata、JS SDK、cNFT 堆栈）
- Switchboard VRF（Devnet/Mainnet）
- Onramp（任选其一，后续可抽象切换）
- 后端：沿用 NestJS；新增 Relayer、索引、风控模块


## 11. 开发与测试建议

- 本地：anchor localnet + 单元/端到端（Mocha/TS）
- Devnet：接近真实网络参数，验证 VRF/优先费/并发
- 日志与指标：
  - Program 日志统一前缀与错误码
  - 代付服务关键指标（成功率/耗时/失败原因/费用/重试次数）


---

下一步建议：在 `injective_pass/solana/` 下初始化 Anchor 程序骨架（NFC Registry + Draw）与最小 Relayer 接口约定，并提供示例前端调用，帮助团队直接启动 PoC。

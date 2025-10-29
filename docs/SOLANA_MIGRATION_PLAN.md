# Solana 迁移与优化方案

本文件概述将 Injective 链抽象项目（injective_pass）迁移到 Solana 的总体思路、依赖、模块拆分与时间表。目标是构建“Web3 生态入口”，降低用户进入门槛，支持法币充值+链上代付、名称解析、抽奖示例 App 等。

## 1. Solana 能力确认与集成建议（含已选策略）

- 域名/名称服务：
  - Solana Name Service（SNS, 名称空间 .sol）与 bonfida 的 on-chain 解析已广泛使用；另有 Decentralized Name Service (ANS) 与 Backpack 的 xNFT 名称体系等。
  - 已选策略（B）：品牌主域 + 子域（例如 `brand.sol` + `<user>.brand.sol`）。主域由平台持有并负责子域创建与解析更新。
  - 替代 Injective 上自建域名系统：优先直接接入 SNS 以获取现成解析（正向/反向）、生态兼容性与二级域名能力。
  - 用户名/昵称若不要求全局唯一，可通过子域满足；如需独占策略，后端/合约可维护保留名与回收规则。
  - 开发要点：
    - 读取解析：@bonfida/spl-name-service（或轻量 RPC 解析服务），支持解析域名->Pubkey、反向解析；
    - 迁移策略：保留 injective ID -> Solana Pubkey 与(可选) .sol 绑定映射表，提供后端索引与缓存。

- 代付/费用赞助：
  - Solana 原生 fee payer 模式：任意交易可由第三方作为 feePayer 支付手续费；
  - 赞助交易流程：
    1) 客户端构建未签名交易（近期区块哈希、指令），
    2) 用户仅对涉及其权限的指令签名（或完全不签，如果单纯调用无签名指令如 TransferWithFee，但一般需要授权），
    3) 将部分签名或签名指令发送给中继后端，
    4) 后端作为 feePayer 附加签名、可选优先费（ComputeBudget），
    5) 发送至 RPC（Jito relayer 可选以获更稳定打包）。
  - 风控与配额：设备指纹/nonce、验证码、人机检测、签名白名单、速率限制、信用额度与账单；
  - 生态组件：
    - Jito 优先费（Tips），以提升拥堵时打包成功率；
    - 优先费策略：按交易价值动态调整或维持上限；
    - ALT（Address Lookup Table）优化大型交易的账户列表。

- 身份与 KYC（SAS）：
  - 采用 Solana Attestation Service（SAS）签发/验证用户凭证（如 KYC_PASS）；
  - 后端Relayer在代付、子域创建、抽奖参与等敏感路径要求有效的 SAS 令牌（JWT/attestation），校验签名、有效期、scope 与公钥绑定。

## 2. 迁移架构映射

- 原项目组件（injective_pass 参考）：
  - 合约：CatNFT_SocialDraw、INJDomainNFT、NFCWalletRegistry、VRF/抽奖逻辑。
  - 后端：NestJS 中台、代付/校验、合约事件订阅、数据索引。
  - 前端：Next.js 与静态版本，连接钱包+抽奖交互。

- Solana 对应：
  - Anchor 程序：
    - social_draw：抽奖与随机性，可优先集成 Switchboard VRF（或使用 recentBlockhash+oracle 混合方案，不建议链上伪随机）。
    - nfc_registry：绑定 NFC UID 与用户主公钥（支持换绑与权限验证）。
    - reward_mint：NFT 奖励（可通过 CPI 调用 Metaplex Token Metadata 与 SPL Token 2022）。也可将 mint 逻辑内聚在 social_draw 以减少账户交互。
  - 中台 relayer：
    - 接收客户端交易/消息，进行签名与代付；
    - 维护风控策略、配额与白名单；
    - 可对接法币 on-ramp（MoonPay、Transak、Ramp Network 等），将充值记录映射为赞助额度。
  - 集成 SAS：所有敏感端点需携带 `X-SAS-JWT` 并通过验证。
  - SDK：
    - 名称解析封装（SNS）；
    - 交易构建与赞助辅助（fee payer、优先费、ALT）；
    - 抽奖与注册流程的客户端胶水层。
  - 自动钱包：提供本地生成/导入 Keypair 的工具方法；可选对接第三方嵌入钱包/MPC 服务。

## 3. 模块与接口草案

- programs/social_draw（Anchor）
  - 指令：
    - create_pool, join_pool, request_randomness, fulfill_randomness (Switchboard 回调), distribute_rewards
  - 账户：
    - Pool PDA（配置、票价、状态）、Participant、Vault（USDC/SOL）、(可选) 奖励 NFT mint authority
  - 安全：
    - 仅管理员可创建/结束；
    - VRF 回调白名单；
    - 结果可验证记录链上。

- programs/nfc_registry（Anchor）
  - 指令：register(uid, owner), rebind(uid, new_owner), revoke(uid)
  - 账户：UIDRecord PDA(uid hash) => owner pubkey, meta
  - 事件：Register, Rebind, Revoke

- programs/reward_mint（可选）
  - 指令：mint_reward_nft(to, metadata)
  - 集成：Metaplex Token Metadata CPI；
  - 或将 mint 集成入 social_draw。

- services/relayer（Node/Express）
  - POST /sponsor：接受 base64 交易/消息，校验 nonce 与签名、风控后作为 feePayer 代付并广播。
  - GET /status/:sig：返回交易状态；
  - 安全：HMAC 应用签名、设备/IP 速率限制，Jito 可选集成。

- packages/solana-sdk
  - resolveName(name) => PublicKey
  - reverseLookup(pubkey) => name | null
  - buildSponsoredTx(ixs, signersPartial, options) => VersionedTransaction（占位，客户端构建+后端补签）

## 4. 路线图（分阶段）

- P0 骨架（本提交）：
  - 文档、SDK 占位、Relayer 占位服务；
  - 说明如何使用 SNS 与代付模式；接入 SAS 的占位校验。
- P1 核心功能：
  - nfc_registry 与 social_draw 初版（devnet）；
  - SDK 支持主要流程；
  - 前端最小 Demo（自动创建钱包、SAS 登录、加入抽奖、赞助交易、子域创建）。
- P2 完善与上生产：
  - VRF 集成、奖励发放、事件索引、风控完善；
  - 法币 on-ramp 对接与配额结算；
  - 压测与观测（metrics、日志）。

## 5. 风险与替代

- VRF 成本与延迟：Switchboard 较稳定，需预算回调费用与账户租金；
- 代付滥用风险：必须有严格风控与额度管理；
- 名称系统：SNS 生态成熟，避免自建重复造轮子；
- 账户尺寸与租金：使用租金豁免与压缩 NFT（compressed NFTs）可降成本。

## 6. 验收与质量门

- 构建：SDK 与 Relayer 可安装/运行；
- Lint/Typecheck：TypeScript 编译通过；
- 单测：后续为 SDK 增加基础用例（名称解析 mock、交易构建）。

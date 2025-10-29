# Anchor 程序设计草案

本设计文档给出迁移后的核心程序接口、账户结构与关键流程，便于后续在根目录创建全新 Anchor 工作区并实现。

> 说明：现有 `gateway/` 为初始化示例。新项目将在根目录新增 `programs/` 目录（如 `programs/social_draw`, `programs/nfc_registry`）。

## social_draw（抽奖与随机性）

- 依赖：Switchboard VRF（推荐）
- 账户
  - `Pool` PDA(seed: ["pool", creator, pool_id])
    - creator: Pubkey
    - ticket_price: u64 (单位：最小单位，如 USDC 6 位或 lamports)
    - currency_mint: Pubkey (SPL Token 或 SOL 虚拟标识)
    - treasury_vault: Pubkey (SPL ATA 或 系统账户)
    - status: u8 (Open/Closed/Settled)
    - randomness: [u8; 32] （VRF 回填）
  - `Participant` PDA(seed: ["participant", pool, user])
    - user: Pubkey
    - tickets: u64
  - （可选）`RewardConfig` PDA（NFT 发放或 SPL 发放配置）

- 指令
  - `create_pool(params)` -> 初始化 `Pool`
  - `join_pool { tickets }` -> 转入 ticket 费用，累加参与度
  - `request_randomness` -> 触发 VRF 请求
  - `fulfill_randomness { random }` -> 由 Switchboard 回调写入 `Pool.randomness`
  - `distribute_rewards` -> 根据 `randomness` 确定赢家并发放奖励（CPI 调用 Metaplex 或 SPL）

- 事件
  - `PoolCreated`, `Joined`, `RandomnessRequested`, `RandomnessFulfilled`, `RewardsDistributed`

- 安全
  - VRF 回调白名单校验；
  - 只有 `creator` 或授权者可 `distribute_rewards`；
  - 使用 `ComputeBudget` 与 ALT 优化交易。

## nfc_registry（NFC 绑定）

- 账户
  - `UidRecord` PDA(seed: ["uid", sha256(uid_bytes)])
    - owner: Pubkey
    - meta: Vec<u8>（可选，小型元数据）

- 指令
  - `register { uid, owner }` -> 创建或更新记录，首次创建需证明所有权（见下）
  - `rebind { uid, new_owner }` -> 换绑
  - `revoke { uid }` -> 注销

- 证明/授权
  - 方案A：链下签发挑战（nonce），用户用钱包签名证明；
  - 方案B：NFC 安全元件派生签名，链上使用 `ed25519_program` 验证；
  - 程序内校验通过后写入 PDA。

- 事件
  - `Registered`, `Rebound`, `Revoked`

## 奖励发放（可合并进 social_draw）

- 若使用 NFT：
  - CPI 调用 Metaplex Token Metadata 创建/铸造；
  - 对于高并发与低成本，可考虑压缩 NFT（Bubblegum）。

- 若使用 SPL 代币：
  - 使用 mint authority PDA 管理发放额度；

## 赞助交易（代付）配合

- 程序本身无需特殊处理；交易由客户端构建后提交给后端代付：
  - 客户端：生成 `ixs`（join_pool 等），`payer` 填用户，但实际 feePayer 将由后端替换；
  - 后端：附加 `ComputeBudget`、设置 `feePayer`、签名并广播；
  - 风控：nonce、速率限制、额度。

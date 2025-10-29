# 身份与 Solana Attestation Service（SAS）

目标：结合 SAS 完成用户 KYC/信誉证明，并将其作为代付、子域创建与敏感操作的前置条件。

## 概览
- SAS 提供可验证的证明（JWT/Attestation），可由后端验证；
- 平台接入路径：
  1) 前端触发 KYC/验证流程，获取 SAS 签发的凭证（JWT/attestation）；
  2) 调用后端 Relayer 时，在请求头附带 `X-SAS-JWT: <token>`；
  3) 后端校验：签名、颁发者、有效期、scope（如 KYC_PASS）、用户公钥绑定；
  4) 通过后端策略决定是否允许代付、创建子域、参与抽奖等。

## 使用场景
- 代付额度：
  - 未验证：仅限小额/低频；
  - 验证通过（KYC）：提升额度与权限。
- 子域创建：
  - 必须通过 SAS 验证（减少滥用与违规名称）。
- 抽奖参与：
  - 可要求 SAS 验证以符合当地法规。

## 后端校验（占位方案）
- 从 `X-SAS-JWT` 解析 header.claims，验证：
  - 签名（发行方公钥/证书链）；
  - exp/nbf 时间；
  - audience 与 scope；
  - 绑定的钱包公钥（如 token 内提供）。

## SDK 支持（规划）
- `setSasToken(token: string)`：在 SDK 内缓存 SAS token，并在调用 Relayer 时附带；
- `requireSas(scope: string)`：在需要的操作前检查本地是否持有有效 token。

## 审计与合规
- 保留最小化数据（避免收集敏感原始KYC材料），仅验证凭证；
- 记录审计日志：请求 IP、用户公钥、token 指纹（不存原 token）。

参考：
- https://solana.com/zh/news/solana-attestation-service
- https://github.com/solana-foundation/solana-attestation-service

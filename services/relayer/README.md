# Relayer

Endpoints:
- POST /sponsor
  - Headers: `X-SAS-JWT: <token>`
  - Body: `{ txBase64, nonce, clientSig }`
  - Behavior: Verifies SAS token, checks nonce (replay protection), validates fee payer, signs as fee payer, and submits tx. Optional simple rate limit.
- POST /names/create-subdomain
  - Headers: `X-SAS-JWT: <token>`
  - Body: `{ parentDomain, sub, targetPubkey }`
  - Behavior: Creates an SNS subdomain and transfers ownership to `targetPubkey`.
 - GET /sponsor/fee-payer
   - Returns the relayer fee payer public key for client-side tx construction.

Notes:
- This service does not include private keys in repo.
- In production, load fee payer key from env/secret manager, verify SAS tokens (JWKS), enforce rate limiting and naming policy, and optionally send via Jito relays.

Config:
- `RPC_ENDPOINT`: Solana RPC URL (default devnet)
- `FEEPAYER_SECRET_KEY_BASE58`: base58-encoded secret key for the relayer fee payer
- `PARENT_OWNER_SECRET_KEY_BASE58`: base58-encoded secret for domain parent owner (for SNS ops)
- `SAS_JWKS_URL`: URL for SAS JWKS (JWT verification)
- `SAS_DEV_BYPASS`: set `true` for local testing to bypass SAS
- `RATE_LIMIT_MAX`: requests per-minute per IP (default 60)

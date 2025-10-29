# Solana API (NestJS)

Modular NestJS service for Solana Pass:
- Auth/SAS via jose JWKS (SasGuard)
- Sponsor module for fee sponsorship
- Names module for SNS subdomain creation & transfer
- Health module for readiness checks

Key differences vs old Injective backend:
- Uses Solana web3.js and Bonfida SNS instead of Solidity/Injective
- Sponsorship replaces initial airdrop funding for users
- Abstracted config and caches; ready for Redis/KMS in production

## Endpoints
- GET /health
- GET /docs (Swagger UI)
- GET /sponsor/fee-payer
- POST /sponsor { txBase64, nonce }
- GET /sponsor/history?limit=
- POST /names/create-subdomain { parentDomain, sub, targetPubkey }

## Config (.env)
- PORT=8788
- RPC_ENDPOINT=https://api.devnet.solana.com
- SAS_JWKS_URL= (required in prod)
- SAS_DEV_BYPASS=false
- RATE_LIMIT_MAX=60
- ACTIVITY_HISTORY_LIMIT=100
- REDIS_URL= (optional; enables durable nonce/dup/rate-limit)
- FEEPAYER_SECRET_KEY_BASE58=
- PARENT_OWNER_SECRET_KEY_BASE58=

## Dev
- pnpm --dir services/solana-api start:dev
- pnpm --dir services/solana-api build && pnpm --dir services/solana-api start

## Next
- Enable Redis in env for nonce/dup/rate-limit/activity durability
- KMS-based fee payer signer (no raw keys)
- Add structured logs/trace IDs and Explorer links in responses
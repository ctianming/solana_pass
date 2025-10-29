# Solana Pass

This repo hosts the Solana Pass web front-end located in `front-end/`.

## Highlights

- NFC onboarding simulation with deterministic key derivation per tag serial
- Solana Name Service flow wired to the NestJS `solana-api` (`/names/check`, `/names/create-subdomain`)
- Sponsored transaction demo that calls `/sponsor` and signs with the stored custodial key
- Activity view that fetches `/sponsor/history` for recent sponsored signatures
- Settings panel to configure API base URL, RPC endpoint, parent domain, and SAS token

## Setup

```bash
pnpm install
pnpm --filter solana-demo dev
```

Environment defaults live in `front-end/.env.local`:

```
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com   # optional override
NEXT_PUBLIC_SOLANA_API_URL=http://localhost:8788      # NestJS solana-api
NEXT_PUBLIC_DEFAULT_PARENT_DOMAIN=brand.sol
```

The Settings page allows overriding these at runtime and persisting them in `localStorage`.

## Deployment (Vercel)

- Root Directory: `front-end`
- Install Command: `pnpm install`
- Build Command: `pnpm build`
- Output Directory: `.next`

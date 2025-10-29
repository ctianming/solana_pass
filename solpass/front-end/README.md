# Solana Pass (Next.js)

A wallet-less, chain-abstraction onboarding UI on Solana. NFC tap to create an account, fiat top-up with sponsored actions, SNS registration, and an ecosystem hub. Built with Next.js App Router and Tailwind.

## Pages

- `/` Home: Overview, hero, charts, features
- `/onboarding` NFC onboarding mock (create/clear local account)
- `/topup` Fiat top-up and sponsored action mock
- `/sns` Register a mock SNS domain to the account
- `/apps` Ecosystem aggregator placeholder
- `/activity` Sponsor history pulled from the Solana API with manual/auto refresh
- `/settings` Theme and language toggles

## Mobile support

- Responsive layout with safe-area support and a mobile bottom tab bar
- Smooth route transitions

## Quick start

1. Ensure pnpm is installed
2. Install deps and run dev server:

   ```bash
   pnpm install
   pnpm dev --port 3030
   ```

   Open http://localhost:3030

## Build

```bash
pnpm build
```

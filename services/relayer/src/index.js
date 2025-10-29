import express from 'express';
import morgan from 'morgan';
import 'dotenv/config';
import bs58 from 'bs58';
import cors from 'cors';
import { Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } from '@solana/web3.js';
import { createSubdomain, transferNameOwnership } from '@bonfida/spl-name-service';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { LRUCache } from 'lru-cache';
import Redis from 'ioredis';
import crypto from 'crypto';

const app = express();
app.use(cors({ origin: /localhost:3010$/ }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

const RPC_ENDPOINT = process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com';
const connection = new Connection(RPC_ENDPOINT, 'confirmed');

function loadKeypair(base58) {
  const secret = bs58.decode(base58);
  return Keypair.fromSecretKey(secret);
}

const feePayer = process.env.FEEPAYER_SECRET_KEY_BASE58 ? loadKeypair(process.env.FEEPAYER_SECRET_KEY_BASE58) : null;
const parentOwner = process.env.PARENT_OWNER_SECRET_KEY_BASE58 ? loadKeypair(process.env.PARENT_OWNER_SECRET_KEY_BASE58) : null;

// SAS JWT verification
const devBypass = String(process.env.SAS_DEV_BYPASS || 'false') === 'true';
const jwksUrl = process.env.SAS_JWKS_URL || '';
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;
const tokenCache = new LRUCache({ max: 1000, ttl: 60_000 });
const NONCE_TTL_SEC = Number(process.env.NONCE_TTL_SEC || 600);
const DEDUPE_TTL_SEC = Number(process.env.DEDUPE_TTL_SEC || 600);
const nonceCache = new LRUCache({ max: 5000, ttl: NONCE_TTL_SEC * 1000 });
const txMsgCache = new LRUCache({ max: 5000, ttl: DEDUPE_TTL_SEC * 1000 });

// Optional Redis
const REDIS_URL = process.env.REDIS_URL || '';
const redis = REDIS_URL ? new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 }) : null;

// Very simple IP-based rate limiter (fixed window)
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 60);
const ipCounters = new Map(); // fallback in-memory

async function rateLimit(req, res, next) {
  try {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
    if (redis) {
      try {
        if (redis.status !== 'ready') await redis.connect().catch(() => {});
        const bucket = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS);
        const key = `rl:${ip}:${bucket}`;
        const cnt = await redis.incr(key);
        if (cnt === 1) await redis.pexpire(key, RATE_LIMIT_WINDOW_MS).catch(() => {});
        if (cnt > RATE_LIMIT_MAX) return res.status(429).json({ error: 'rate_limited' });
        return next();
      } catch (_) {
        // fall through to memory if redis errors
      }
    }
    // in-memory fallback
    const now = Date.now();
    const entry = ipCounters.get(ip) || { count: 0, windowStart: now };
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      entry.count = 0;
      entry.windowStart = now;
    }
    entry.count += 1;
    ipCounters.set(ip, entry);
    if (entry.count > RATE_LIMIT_MAX) return res.status(429).json({ error: 'rate_limited' });
    return next();
  } catch (e) {
    return res.status(500).json({ error: 'rate_limit_internal', detail: String(e) });
  }
}

async function nonceSeenBefore(nonce) {
  if (redis) {
    try {
      if (redis.status !== 'ready') await redis.connect().catch(() => {});
      const key = `nonce:${nonce}`;
      const set = await redis.set(key, '1', 'EX', NONCE_TTL_SEC, 'NX');
      return set === null; // null means exists already
    } catch (_) { /* fallback below */ }
  }
  if (nonceCache.has(nonce)) return true;
  nonceCache.set(nonce, true);
  return false;
}

async function messageSeenBefore(hashHex) {
  if (redis) {
    try {
      if (redis.status !== 'ready') await redis.connect().catch(() => {});
      const key = `msg:${hashHex}`;
      const set = await redis.set(key, '1', 'EX', DEDUPE_TTL_SEC, 'NX');
      return set === null;
    } catch (_) { /* fallback below */ }
  }
  if (txMsgCache.has(hashHex)) return true;
  txMsgCache.set(hashHex, true);
  return false;
}

async function verifySasJwt(req, res, next) {
  try {
    if (devBypass) return next();
    const sasJwt = req.header('X-SAS-JWT');
    if (!sasJwt) return res.status(401).json({ error: 'SAS token required' });
    if (tokenCache.has(sasJwt)) return next();
    if (!jwks) return res.status(500).json({ error: 'SAS verifier not configured' });
    const { payload } = await jwtVerify(sasJwt, jwks, {});
    const scopes = Array.isArray(payload.scope) ? payload.scope : String(payload.scope || '').split(' ');
    if (!scopes.includes('KYC_PASS')) return res.status(403).json({ error: 'insufficient scope' });
    tokenCache.set(sasJwt, true);
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid SAS token', detail: String(e) });
  }
}

// Health
app.get('/health', async (_, res) => {
  try {
    const { blockhash } = await connection.getLatestBlockhash('finalized');
    return res.json({ ok: true, blockhash: blockhash.slice(0, 8) });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// Sponsor: relayer signs as fee payer and forwards the tx
// Requirements:
// - txBase64: base64 encoded VersionedTransaction (v0) message with payer set to relayer feePayer pubkey
// - nonce: unique string to prevent replay (cached for TTL)
// - clientSig: opaque signature for your app-level auth (optional here; SAS is enforced)
// Notes:
// - We DO NOT modify the message (no fee replacement or compute ixs) to preserve existing signatures.
// - If you need priority fees, include ComputeBudget instructions client-side.
app.post('/sponsor', verifySasJwt, rateLimit, async (req, res) => {
  try {
    if (!feePayer) return res.status(500).json({ error: 'relayer fee payer not configured' });

    const { txBase64, nonce, clientSig } = req.body || {};
    if (!txBase64 || !nonce) return res.status(400).json({ error: 'missing fields' });

  // Nonce replay check (Redis or in-memory)
  if (await nonceSeenBefore(nonce)) return res.status(409).json({ error: 'nonce_replay' });

    // Decode transaction
    let tx;
    try {
      const bytes = Buffer.from(txBase64, 'base64');
      tx = VersionedTransaction.deserialize(bytes);
    } catch (e) {
      return res.status(400).json({ error: 'invalid_tx_base64', detail: String(e) });
    }

    // Validate payer matches relayer
    const payerKey = tx.message.staticAccountKeys[0]; // fee payer is always first static account key
    if (!payerKey.equals(feePayer.publicKey)) {
      return res.status(400).json({ error: 'invalid_payer', expected: feePayer.publicKey.toBase58(), got: payerKey.toBase58() });
    }

    // Dedup by message hash (idempotency)
    const msgBytes = tx.message.serialize();
    const msgHash = crypto.createHash('sha256').update(msgBytes).digest('hex');
    if (await messageSeenBefore(msgHash)) {
      return res.status(409).json({ error: 'duplicate_tx', hint: 'message hash seen recently' });
    }

    // Sign as fee payer (add only missing signature slot)
    try {
      tx.sign([feePayer]);
    } catch (e) {
      return res.status(400).json({ error: 'sign_failed', detail: String(e) });
    }

    // Submit
    const sig = await connection.sendTransaction(tx, { skipPreflight: false, maxRetries: 2 });
    return res.json({ accepted: true, txId: sig });
  } catch (e) {
    return res.status(500).json({ error: 'sponsor_internal', detail: String(e) });
  }
});

// Helper: expose fee payer pubkey so clients can build tx with correct payer
app.get('/sponsor/fee-payer', (_, res) => {
  if (!feePayer) return res.status(500).json({ error: 'relayer fee payer not configured' });
  return res.json({ feePayer: feePayer.publicKey.toBase58() });
});

// Create subdomain endpoint (real implementation)
app.post('/names/create-subdomain', verifySasJwt, async (req, res) => {
  try {
    if (!feePayer || !parentOwner) return res.status(500).json({ error: 'relayer not configured with keys' });

    const { parentDomain, sub, targetPubkey } = req.body || {};
    if (!parentDomain || !sub || !targetPubkey) return res.status(400).json({ error: 'missing fields' });

    const userPk = new PublicKey(targetPubkey);

    const base = parentDomain.replace(/\.sol$/, '');
    const fqdn = `${sub}.${base}`;

    const ixGroupsCreate = await createSubdomain(connection, fqdn, parentOwner.publicKey);
    const ixGroupsTransfer = await transferNameOwnership(connection, `${fqdn}.sol`, userPk, undefined, undefined, parentOwner.publicKey);

    const ixs = [...ixGroupsCreate.flat(), ...ixGroupsTransfer.flat()];
    const computeIxs = [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })];

    const { blockhash } = await connection.getLatestBlockhash('finalized');
    const msg = new TransactionMessage({
      payerKey: feePayer.publicKey,
      recentBlockhash: blockhash,
      instructions: [...computeIxs, ...ixs],
    }).compileToV0Message();
    const tx = new VersionedTransaction(msg);

    tx.sign([feePayer, parentOwner]);
    const sig = await connection.sendTransaction(tx, { skipPreflight: true });
    return res.json({ accepted: true, domain: `${fqdn}.sol`, owner: userPk.toBase58(), txId: sig });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`[relayer] listening on :${port}`));

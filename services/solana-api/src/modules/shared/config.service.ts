import { Injectable } from '@nestjs/common';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { LRUCache } from 'lru-cache';

function loadKeypair(base58?: string | null) {
  if (!base58) return null;
  const secret = bs58.decode(base58);
  return Keypair.fromSecretKey(secret);
}

@Injectable()
export class ConfigService {
  readonly rpcEndpoint = process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com';
  readonly connection = new Connection(this.rpcEndpoint, 'confirmed');
  readonly feePayer = loadKeypair(process.env.FEEPAYER_SECRET_KEY_BASE58);
  readonly parentOwner = loadKeypair(process.env.PARENT_OWNER_SECRET_KEY_BASE58);
  // Caches
  readonly nonceCache = new LRUCache<string, boolean>({ max: 5000, ttl: 10 * 60_000 });
  readonly msgCache = new LRUCache<string, boolean>({ max: 5000, ttl: 10 * 60_000 });
}

import { Injectable, OnModuleInit } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

export interface ActivityPayload {
  id: string;
  kind: 'sponsor';
  txId: string;
  signers?: string[];
  memo?: string | null;
}

export interface ActivityEntry extends ActivityPayload {
  timestamp: string;
}

@Injectable()
export class RedisClient implements OnModuleInit {
  client: any = null;
  async onModuleInit() {
    const url = process.env.REDIS_URL || '';
    if (!url) return;
    const mod = await import('ioredis');
    const RedisAny: any = (mod as any).default ?? mod;
    this.client = new RedisAny(url, { maxRetriesPerRequest: 3, lazyConnect: true } as any);
    try { await (this.client.connect?.() ?? Promise.resolve()); } catch { this.client = null; }
  }
}

@Injectable()
export class NonceStore {
  private mem = new LRUCache<string, boolean>({ max: 50_000, ttl: 10 * 60_000 });
  constructor(private readonly redis: RedisClient) {}
  async setOnce(nonce: string): Promise<boolean> {
    if (this.redis.client) {
      const ok = await this.redis.client.setnx(`nonce:${nonce}`, '1');
      if (ok) await this.redis.client.expire(`nonce:${nonce}`, 600);
      return ok === 1;
    }
    if (this.mem.has(nonce)) return false;
    this.mem.set(nonce, true);
    return true;
  }
}

@Injectable()
export class MsgStore {
  private mem = new LRUCache<string, boolean>({ max: 50_000, ttl: 10 * 60_000 });
  constructor(private readonly redis: RedisClient) {}
  async setIfNew(hash: string): Promise<boolean> {
    if (this.redis.client) {
      const ok = await this.redis.client.setnx(`msg:${hash}`, '1');
      if (ok) await this.redis.client.expire(`msg:${hash}`, 600);
      return ok === 1;
    }
    if (this.mem.has(hash)) return false;
    this.mem.set(hash, true);
    return true;
  }
}

@Injectable()
export class RateLimitService {
  // sliding window approx using incr+expiry; fallback to memory bucket
  private mem = new Map<string, { count: number; windowStart: number }>();
  private windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  private maxReq = Number(process.env.RATE_LIMIT_MAX || 60);
  constructor(private readonly redis: RedisClient) {}
  async allow(key: string): Promise<boolean> {
    if (this.redis.client) {
      const nowBucket = Math.floor(Date.now() / this.windowMs);
      const rk = `rl:${key}:${nowBucket}`;
      const count = await this.redis.client.incr(rk);
      if (count === 1) await this.redis.client.pexpire(rk, this.windowMs);
      return count <= this.maxReq;
    }
    const now = Date.now();
    const entry = this.mem.get(key) || { count: 0, windowStart: now };
    if (now - entry.windowStart > this.windowMs) { entry.count = 0; entry.windowStart = now; }
    entry.count += 1; this.mem.set(key, entry);
    return entry.count <= this.maxReq;
  }
}

@Injectable()
export class ActivityStore {
  private mem: ActivityEntry[] = [];
  private readonly key = 'activity:global';
  private readonly cap = Number(process.env.ACTIVITY_HISTORY_LIMIT || 100);

  constructor(private readonly redis: RedisClient) {}

  async record(activity: ActivityPayload): Promise<void> {
    const entry: ActivityEntry = { ...activity, timestamp: new Date().toISOString() };
    if (this.redis.client) {
      await this.redis.client.lpush(this.key, JSON.stringify(entry));
      await this.redis.client.ltrim(this.key, 0, this.cap - 1);
      return;
    }
    this.mem.unshift(entry);
    if (this.mem.length > this.cap) this.mem.length = this.cap;
  }

  async fetch(limit = 20): Promise<ActivityEntry[]> {
    const take = Math.min(limit, this.cap);
    if (this.redis.client) {
      const raw: string[] = await this.redis.client.lrange(this.key, 0, take - 1);
      return raw
        .map((line) => {
          try {
            return JSON.parse(line) as ActivityEntry;
          } catch {
            return null;
          }
        })
        .filter((v): v is ActivityEntry => Boolean(v));
    }
    return this.mem.slice(0, take);
  }
}

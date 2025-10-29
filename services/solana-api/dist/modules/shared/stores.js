var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';
let RedisClient = class RedisClient {
    constructor() {
        this.client = null;
    }
    async onModuleInit() {
        const url = process.env.REDIS_URL || '';
        if (!url)
            return;
        const mod = await import('ioredis');
        const RedisAny = mod.default ?? mod;
        this.client = new RedisAny(url, { maxRetriesPerRequest: 3, lazyConnect: true });
        try {
            await (this.client.connect?.() ?? Promise.resolve());
        }
        catch {
            this.client = null;
        }
    }
};
RedisClient = __decorate([
    Injectable()
], RedisClient);
export { RedisClient };
let NonceStore = class NonceStore {
    constructor(redis) {
        this.redis = redis;
        this.mem = new LRUCache({ max: 50000, ttl: 10 * 60000 });
    }
    async setOnce(nonce) {
        if (this.redis.client) {
            const ok = await this.redis.client.setnx(`nonce:${nonce}`, '1');
            if (ok)
                await this.redis.client.expire(`nonce:${nonce}`, 600);
            return ok === 1;
        }
        if (this.mem.has(nonce))
            return false;
        this.mem.set(nonce, true);
        return true;
    }
};
NonceStore = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [RedisClient])
], NonceStore);
export { NonceStore };
let MsgStore = class MsgStore {
    constructor(redis) {
        this.redis = redis;
        this.mem = new LRUCache({ max: 50000, ttl: 10 * 60000 });
    }
    async setIfNew(hash) {
        if (this.redis.client) {
            const ok = await this.redis.client.setnx(`msg:${hash}`, '1');
            if (ok)
                await this.redis.client.expire(`msg:${hash}`, 600);
            return ok === 1;
        }
        if (this.mem.has(hash))
            return false;
        this.mem.set(hash, true);
        return true;
    }
};
MsgStore = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [RedisClient])
], MsgStore);
export { MsgStore };
let RateLimitService = class RateLimitService {
    constructor(redis) {
        this.redis = redis;
        // sliding window approx using incr+expiry; fallback to memory bucket
        this.mem = new Map();
        this.windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
        this.maxReq = Number(process.env.RATE_LIMIT_MAX || 60);
    }
    async allow(key) {
        if (this.redis.client) {
            const nowBucket = Math.floor(Date.now() / this.windowMs);
            const rk = `rl:${key}:${nowBucket}`;
            const count = await this.redis.client.incr(rk);
            if (count === 1)
                await this.redis.client.pexpire(rk, this.windowMs);
            return count <= this.maxReq;
        }
        const now = Date.now();
        const entry = this.mem.get(key) || { count: 0, windowStart: now };
        if (now - entry.windowStart > this.windowMs) {
            entry.count = 0;
            entry.windowStart = now;
        }
        entry.count += 1;
        this.mem.set(key, entry);
        return entry.count <= this.maxReq;
    }
};
RateLimitService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [RedisClient])
], RateLimitService);
export { RateLimitService };
let ActivityStore = class ActivityStore {
    constructor(redis) {
        this.redis = redis;
        this.mem = [];
        this.key = 'activity:global';
        this.cap = Number(process.env.ACTIVITY_HISTORY_LIMIT || 100);
    }
    async record(activity) {
        const entry = { ...activity, timestamp: new Date().toISOString() };
        if (this.redis.client) {
            await this.redis.client.lpush(this.key, JSON.stringify(entry));
            await this.redis.client.ltrim(this.key, 0, this.cap - 1);
            return;
        }
        this.mem.unshift(entry);
        if (this.mem.length > this.cap)
            this.mem.length = this.cap;
    }
    async fetch(limit = 20) {
        const take = Math.min(limit, this.cap);
        if (this.redis.client) {
            const raw = await this.redis.client.lrange(this.key, 0, take - 1);
            return raw
                .map((line) => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    return null;
                }
            })
                .filter((v) => Boolean(v));
        }
        return this.mem.slice(0, take);
    }
};
ActivityStore = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [RedisClient])
], ActivityStore);
export { ActivityStore };

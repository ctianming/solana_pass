var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Controller, Get } from '@nestjs/common';
import { Connection } from '@solana/web3.js';
import { RedisClient } from '../shared/stores.js';
let HealthController = class HealthController {
    constructor(redis) {
        this.redis = redis;
        this.connection = new Connection(process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com', 'confirmed');
    }
    async get() {
        try {
            const { blockhash } = await this.connection.getLatestBlockhash('finalized');
            const redisOk = !!this.redis.client && this.redis.client.status === 'ready';
            return { ok: true, blockhash: blockhash.slice(0, 8), redis: redisOk ? 'ready' : 'disabled' };
        }
        catch (e) {
            return { ok: false, error: String(e?.message || e) };
        }
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "get", null);
HealthController = __decorate([
    Controller('health'),
    __metadata("design:paramtypes", [RedisClient])
], HealthController);
export { HealthController };

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { LRUCache } from 'lru-cache';
function loadKeypair(base58) {
    if (!base58)
        return null;
    const secret = bs58.decode(base58);
    return Keypair.fromSecretKey(secret);
}
let ConfigService = class ConfigService {
    constructor() {
        this.rpcEndpoint = process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com';
        this.connection = new Connection(this.rpcEndpoint, 'confirmed');
        this.feePayer = loadKeypair(process.env.FEEPAYER_SECRET_KEY_BASE58);
        this.parentOwner = loadKeypair(process.env.PARENT_OWNER_SECRET_KEY_BASE58);
        // Caches
        this.nonceCache = new LRUCache({ max: 5000, ttl: 10 * 60000 });
        this.msgCache = new LRUCache({ max: 5000, ttl: 10 * 60000 });
    }
};
ConfigService = __decorate([
    Injectable()
], ConfigService);
export { ConfigService };

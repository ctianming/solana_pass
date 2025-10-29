var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PublicKey, VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import { SasGuard } from '../shared/sas.guard.js';
import { RateLimitGuard } from '../shared/rate-limit.guard.js';
import { ConfigService } from '../shared/config.service.js';
import { ActivityStore, MsgStore, NonceStore } from '../shared/stores.js';
let SponsorController = class SponsorController {
    constructor(cfg, nonces, msgs, activity) {
        this.cfg = cfg;
        this.nonces = nonces;
        this.msgs = msgs;
        this.activity = activity;
    }
    feePayer() {
        if (!this.cfg.feePayer)
            return { error: 'relayer fee payer not configured' };
        return { feePayer: this.cfg.feePayer.publicKey.toBase58() };
    }
    async sponsor(body) {
        if (!this.cfg.feePayer)
            return { error: 'relayer fee payer not configured' };
        const { txBase64, nonce } = body || {};
        if (!txBase64 || !nonce)
            return { error: 'missing fields' };
        const fresh = await this.nonces.setOnce(nonce);
        if (!fresh)
            return { error: 'nonce_replay' };
        let tx;
        try {
            tx = VersionedTransaction.deserialize(Buffer.from(txBase64, 'base64'));
        }
        catch (e) {
            return { error: 'invalid_tx_base64', detail: String(e) };
        }
        const payerKey = tx.message.staticAccountKeys[0];
        if (!payerKey.equals(this.cfg.feePayer.publicKey)) {
            return { error: 'invalid_payer', expected: this.cfg.feePayer.publicKey.toBase58(), got: payerKey.toBase58() };
        }
        const msgHash = crypto.createHash('sha256').update(tx.message.serialize()).digest('hex');
        const unique = await this.msgs.setIfNew(msgHash);
        if (!unique)
            return { error: 'duplicate_tx' };
        try {
            tx.sign([this.cfg.feePayer]);
        }
        catch (e) {
            return { error: 'sign_failed', detail: String(e) };
        }
        const sig = await this.cfg.connection.sendTransaction(tx, { skipPreflight: false, maxRetries: 2 });
        const signerKeys = this.extractSigners(tx);
        const memo = this.extractMemo(tx);
        await this.activity.record({ id: msgHash, kind: 'sponsor', txId: sig, signers: signerKeys, memo });
        return { accepted: true, txId: sig };
    }
    async history(limit) {
        const parsed = Number(limit);
        const take = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 100) : 20;
        const items = await this.activity.fetch(take);
        return { items };
    }
    extractSigners(tx) {
        const feePayer = this.cfg.feePayer?.publicKey;
        const keys = tx.message.staticAccountKeys;
        const signers = [];
        for (let i = 0; i < keys.length; i += 1) {
            if (!tx.message.isAccountSigner(i))
                continue;
            if (feePayer && keys[i].equals(feePayer))
                continue;
            signers.push(keys[i].toBase58());
        }
        return signers;
    }
    extractMemo(tx) {
        const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
        const keys = tx.message.staticAccountKeys;
        for (const ix of tx.message.compiledInstructions) {
            if (ix.programIdIndex >= keys.length)
                continue;
            if (!keys[ix.programIdIndex].equals(memoProgram))
                continue;
            if (!ix.data)
                continue;
            try {
                return Buffer.from(ix.data).toString('utf8');
            }
            catch {
                return null;
            }
        }
        return null;
    }
};
__decorate([
    Get('fee-payer'),
    ApiResponse({ status: 200, description: 'Returns current fee payer pubkey' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SponsorController.prototype, "feePayer", null);
__decorate([
    UseGuards(SasGuard, RateLimitGuard),
    ApiBearerAuth('sas'),
    ApiBody({ schema: { properties: { txBase64: { type: 'string' }, nonce: { type: 'string' }, clientSig: { type: 'string', nullable: true } }, required: ['txBase64', 'nonce'] } }),
    ApiResponse({ status: 201, description: 'Sponsored transaction accepted' }),
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SponsorController.prototype, "sponsor", null);
__decorate([
    UseGuards(SasGuard, RateLimitGuard),
    ApiBearerAuth('sas'),
    ApiQuery({ name: 'limit', required: false, description: 'Max entries', schema: { type: 'integer', minimum: 1, maximum: 100 } }),
    ApiResponse({ status: 200, description: 'Recent sponsored transactions' }),
    Get('history'),
    __param(0, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SponsorController.prototype, "history", null);
SponsorController = __decorate([
    ApiTags('sponsor'),
    Controller('sponsor'),
    __metadata("design:paramtypes", [ConfigService,
        NonceStore,
        MsgStore,
        ActivityStore])
], SponsorController);
export { SponsorController };

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
import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ComputeBudgetProgram, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { SasGuard } from '../shared/sas.guard.js';
import { RateLimitGuard } from '../shared/rate-limit.guard.js';
import { ConfigService } from '../shared/config.service.js';
let NamesController = class NamesController {
    constructor(cfg) {
        this.cfg = cfg;
    }
    async checkAvailability(domain) {
        const raw = typeof domain === 'string' ? domain.trim() : '';
        if (!raw)
            throw new BadRequestException('missing domain');
        try {
            const normalized = raw.endsWith('.sol') ? raw : `${raw}.sol`;
            const { getDomainKeySync } = await import('@bonfida/spl-name-service');
            // @ts-ignore runtime only
            const { pubkey } = getDomainKeySync(normalized);
            const info = await this.cfg.connection.getAccountInfo(pubkey, 'confirmed');
            if (!info)
                return { available: true };
            return { available: false, lamports: info.lamports, owner: info.owner.toBase58() };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new BadRequestException(msg);
        }
    }
    async createSubdomain(body) {
        if (!this.cfg.feePayer || !this.cfg.parentOwner)
            return { error: 'relayer not configured with keys' };
        const { parentDomain, sub, targetPubkey } = body || {};
        if (!parentDomain || !sub || !targetPubkey)
            return { error: 'missing fields' };
        const userPk = new PublicKey(targetPubkey);
        const base = parentDomain.replace(/\.sol$/, '');
        const fqdn = `${sub}.${base}`;
        const { createSubdomain, transferNameOwnership } = await import('@bonfida/spl-name-service');
        // @ts-ignore runtime only
        const ixGroupsCreate = await createSubdomain(this.cfg.connection, fqdn, this.cfg.parentOwner.publicKey);
        // @ts-ignore runtime only
        const ixGroupsTransfer = await transferNameOwnership(this.cfg.connection, `${fqdn}.sol`, userPk, undefined, undefined, this.cfg.parentOwner.publicKey);
        const ixs = [...ixGroupsCreate.flat(), ...ixGroupsTransfer.flat()];
        const computeIxs = [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 })];
        const { blockhash } = await this.cfg.connection.getLatestBlockhash('finalized');
        const msg = new TransactionMessage({ payerKey: this.cfg.feePayer.publicKey, recentBlockhash: blockhash, instructions: [...computeIxs, ...ixs] }).compileToV0Message();
        const tx = new VersionedTransaction(msg);
        tx.sign([this.cfg.feePayer, this.cfg.parentOwner]);
        const sig = await this.cfg.connection.sendTransaction(tx, { skipPreflight: true });
        return { accepted: true, domain: `${fqdn}.sol`, owner: userPk.toBase58(), txId: sig };
    }
};
__decorate([
    Get('check'),
    ApiQuery({ name: 'domain', description: 'Fully qualified domain (e.g. user.brand.sol)' }),
    ApiResponse({ status: 200, description: 'Domain availability status' }),
    __param(0, Query('domain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NamesController.prototype, "checkAvailability", null);
__decorate([
    UseGuards(SasGuard, RateLimitGuard),
    ApiBearerAuth('sas'),
    ApiBody({ schema: { properties: { parentDomain: { type: 'string' }, sub: { type: 'string' }, targetPubkey: { type: 'string' } }, required: ['parentDomain', 'sub', 'targetPubkey'] } }),
    ApiResponse({ status: 201, description: 'Subdomain created and transferred' }),
    Post('create-subdomain'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NamesController.prototype, "createSubdomain", null);
NamesController = __decorate([
    ApiTags('names'),
    Controller('names'),
    __metadata("design:paramtypes", [ConfigService])
], NamesController);
export { NamesController };

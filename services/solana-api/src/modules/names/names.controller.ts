import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ComputeBudgetProgram, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
// Bonfida types are not fully exported; rely on runtime import and local declarations
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type {} from '@bonfida/spl-name-service';
import { SasGuard } from '../shared/sas.guard.js';
import { RateLimitGuard } from '../shared/rate-limit.guard.js';
import { ConfigService } from '../shared/config.service.js';

@ApiTags('names')
@Controller('names')
export class NamesController {
  constructor(private readonly cfg: ConfigService) {}

  @Get('check')
  @ApiQuery({ name: 'domain', description: 'Fully qualified domain (e.g. user.brand.sol)' })
  @ApiResponse({ status: 200, description: 'Domain availability status' })
  async checkAvailability(@Query('domain') domain?: string) {
  const raw = typeof domain === 'string' ? domain.trim() : '';
  if (!raw) throw new BadRequestException('missing domain');
    try {
      const normalized = raw.endsWith('.sol') ? raw : `${raw}.sol`;
      const { getDomainKeySync } = await import('@bonfida/spl-name-service');
      // @ts-ignore runtime only
      const { pubkey } = getDomainKeySync(normalized);
      const info = await this.cfg.connection.getAccountInfo(pubkey, 'confirmed');
      if (!info) return { available: true };
      return { available: false, lamports: info.lamports, owner: info.owner.toBase58() };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(msg);
    }
  }

  @UseGuards(SasGuard, RateLimitGuard)
  @ApiBearerAuth('sas')
  @ApiBody({ schema: { properties: { parentDomain: { type: 'string' }, sub: { type: 'string' }, targetPubkey: { type: 'string' } }, required: ['parentDomain','sub','targetPubkey'] } })
  @ApiResponse({ status: 201, description: 'Subdomain created and transferred' })
  @Post('create-subdomain')
  async createSubdomain(@Body() body: { parentDomain: string; sub: string; targetPubkey: string }) {
  if (!this.cfg.feePayer || !this.cfg.parentOwner) return { error: 'relayer not configured with keys' };
    const { parentDomain, sub, targetPubkey } = body || ({} as any);
    if (!parentDomain || !sub || !targetPubkey) return { error: 'missing fields' };

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
}

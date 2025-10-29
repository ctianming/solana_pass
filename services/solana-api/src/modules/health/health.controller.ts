import { Controller, Get } from '@nestjs/common';
import { Connection } from '@solana/web3.js';
import { RedisClient } from '../shared/stores.js';

@Controller('health')
export class HealthController {
  constructor(private readonly redis: RedisClient) {}
  private connection = new Connection(process.env.RPC_ENDPOINT || 'https://api.devnet.solana.com', 'confirmed');

  @Get()
  async get() {
    try {
  const { blockhash } = await this.connection.getLatestBlockhash('finalized');
  const redisOk = !!this.redis.client && this.redis.client.status === 'ready';
  return { ok: true, blockhash: blockhash.slice(0, 8), redis: redisOk ? 'ready' : 'disabled' };
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  }
}

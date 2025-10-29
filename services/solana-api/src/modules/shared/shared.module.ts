import { Module } from '@nestjs/common';
import { ConfigService } from './config.service.js';
import { SasGuard } from './sas.guard.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { ActivityStore, MsgStore, NonceStore, RateLimitService, RedisClient } from './stores.js';

@Module({
  providers: [ConfigService, SasGuard, RateLimitGuard, RedisClient, NonceStore, MsgStore, RateLimitService, ActivityStore],
  exports: [ConfigService, SasGuard, RateLimitGuard, RedisClient, NonceStore, MsgStore, RateLimitService, ActivityStore],
})
export class SharedModule {}

import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { NamesModule } from './names/names.module.js';
import { SponsorModule } from './sponsor/sponsor.module.js';
import { SharedModule } from './shared/shared.module.js';

@Module({
  imports: [SharedModule, HealthModule, NamesModule, SponsorModule],
})
export class AppModule {}

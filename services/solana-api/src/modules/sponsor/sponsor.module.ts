import { Module } from '@nestjs/common';
import { SponsorController } from './sponsor.controller.js';
import { SharedModule } from '../shared/shared.module.js';

@Module({ imports: [SharedModule], controllers: [SponsorController] })
export class SponsorModule {}

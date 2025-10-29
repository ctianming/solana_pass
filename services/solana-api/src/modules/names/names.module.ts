import { Module } from '@nestjs/common';
import { NamesController } from './names.controller.js';
import { SharedModule } from '../shared/shared.module.js';

@Module({ imports: [SharedModule], controllers: [NamesController] })
export class NamesModule {}

var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigService } from './config.service.js';
import { SasGuard } from './sas.guard.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { ActivityStore, MsgStore, NonceStore, RateLimitService, RedisClient } from './stores.js';
let SharedModule = class SharedModule {
};
SharedModule = __decorate([
    Module({
        providers: [ConfigService, SasGuard, RateLimitGuard, RedisClient, NonceStore, MsgStore, RateLimitService, ActivityStore],
        exports: [ConfigService, SasGuard, RateLimitGuard, RedisClient, NonceStore, MsgStore, RateLimitService, ActivityStore],
    })
], SharedModule);
export { SharedModule };

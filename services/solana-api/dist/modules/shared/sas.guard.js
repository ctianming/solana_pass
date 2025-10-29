var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { LRUCache } from 'lru-cache';
const tokenCache = new LRUCache({ max: 1000, ttl: 60000 });
const jwksUrl = process.env.SAS_JWKS_URL || '';
const devBypass = String(process.env.SAS_DEV_BYPASS || 'false') === 'true';
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;
let SasGuard = class SasGuard {
    async canActivate(context) {
        if (devBypass)
            return true;
        const req = context.switchToHttp().getRequest();
        const token = req.headers['x-sas-jwt'];
        if (!token || typeof token !== 'string')
            return false;
        if (tokenCache.has(token))
            return true;
        if (!jwks)
            return false;
        const { payload } = await jwtVerify(token, jwks, {});
        const scopeRaw = Array.isArray(payload.scope) ? payload.scope : String(payload.scope || '').split(' ');
        if (!scopeRaw.includes('KYC_PASS'))
            return false;
        tokenCache.set(token, true);
        return true;
    }
};
SasGuard = __decorate([
    Injectable()
], SasGuard);
export { SasGuard };

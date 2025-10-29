import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { LRUCache } from 'lru-cache';

const tokenCache = new LRUCache({ max: 1000, ttl: 60_000 });
const jwksUrl = process.env.SAS_JWKS_URL || '';
const devBypass = String(process.env.SAS_DEV_BYPASS || 'false') === 'true';
const jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;

@Injectable()
export class SasGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (devBypass) return true;
    const req = context.switchToHttp().getRequest();
    const token = req.headers['x-sas-jwt'];
    if (!token || typeof token !== 'string') return false;
    if (tokenCache.has(token)) return true;
    if (!jwks) return false;
    const { payload } = await jwtVerify(token, jwks, {});
    const scopeRaw = Array.isArray(payload.scope) ? payload.scope : String(payload.scope || '').split(' ');
    if (!scopeRaw.includes('KYC_PASS')) return false;
    tokenCache.set(token, true);
    return true;
  }
}

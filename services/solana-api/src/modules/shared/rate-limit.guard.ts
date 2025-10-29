import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RateLimitService } from './stores.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rl: RateLimitService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0].trim()) || req.ip || req.socket?.remoteAddress || 'unknown';
    return this.rl.allow(ip);
  }
}

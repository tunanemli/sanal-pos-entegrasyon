import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly requests = new Map<string, RateLimitEntry>();
  
  // Rate limit ayarları
  private readonly maxRequests = 10; // 10 dakikada maksimum istek sayısı
  private readonly windowMs = 10 * 60 * 1000; // 10 dakika (millisecond)

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);
    
    const now = Date.now();
    const key = `${clientIp}_payment`;
    
    // Eski kayıtları temizle
    this.cleanupExpiredEntries(now);
    
    const entry = this.requests.get(key);
    
    if (!entry) {
      // İlk istek
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }
    
    if (now > entry.resetTime) {
      // Zaman aşımı, sıfırla
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }
    
    if (entry.count >= this.maxRequests) {
      // Rate limit aşıldı
      this.logger.warn(`Rate limit exceeded for IP: ${clientIp}`);
      
      throw new HttpException(
        {
          success: false,
          errorCode: 'RATE_LIMIT_EXCEEDED',
          errorMessage: 'Çok fazla istek gönderdiniz. Lütfen bir süre bekleyip tekrar deneyin.',
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    
    // İstek sayısını artır
    entry.count++;
    this.requests.set(key, entry);
    
    return true;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    const realIp = request.headers['x-real-ip'] as string;
    const remoteAddress = request.connection?.remoteAddress;
    const socketRemoteAddress = request.socket?.remoteAddress;

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return realIp || remoteAddress || socketRemoteAddress || 'unknown';
  }

  private cleanupExpiredEntries(now: number): void {
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }
} 
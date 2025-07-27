import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip } = request;
    
    const start = Date.now();
    const requestId = this.generateRequestId();

    // Request loglama (hassas verileri maskele)
    const maskedBody = this.maskSensitiveData(request.body);
    this.logger.log(`[${requestId}] ${method} ${url} - IP: ${ip} - Request: ${JSON.stringify(maskedBody)}`);

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          const duration = Date.now() - start;
          const maskedResponse = this.maskSensitiveResponseData(responseData);
          
          this.logger.log(
            `[${requestId}] ${method} ${url} - ${response.statusCode} - ${duration}ms - Response: ${JSON.stringify(maskedResponse)}`
          );
        },
        error: (error) => {
          const duration = Date.now() - start;
          this.logger.error(
            `[${requestId}] ${method} ${url} - ERROR - ${duration}ms - ${error.message}`,
            error.stack
          );
        },
      })
    );
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private maskSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const masked = { ...data };
    const sensitiveFields = [
      'cardNumber',
      'cvv',
      'password',
      'card_number',
      'expiry_date',
      'expiryDate'
    ];

    sensitiveFields.forEach(field => {
      if (masked[field]) {
        if (field === 'cardNumber' || field === 'card_number') {
          // Kart numarasının ilk 6 ve son 4 hanesini göster
          const cardNumber = masked[field].toString();
          if (cardNumber.length >= 10) {
            masked[field] = `${cardNumber.substring(0, 6)}****${cardNumber.substring(cardNumber.length - 4)}`;
          } else {
            masked[field] = '****';
          }
        } else if (field === 'cvv') {
          masked[field] = '***';
        } else if (field === 'expiryDate' || field === 'expiry_date') {
          masked[field] = 'XX/XX';
        } else {
          masked[field] = '***';
        }
      }
    });

    return masked;
  }

  private maskSensitiveResponseData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const masked = { ...data };
    
    // Response'ta da hassas alanları maskele
    const sensitiveFields = [
      'transactionId',
      'authCode',
      'hostReference'
    ];

    sensitiveFields.forEach(field => {
      if (masked[field]) {
        const value = masked[field].toString();
        if (value.length > 8) {
          masked[field] = `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
        } else if (value.length > 4) {
          masked[field] = `${value.substring(0, 2)}****`;
        }
      }
    });

    return masked;
  }
} 
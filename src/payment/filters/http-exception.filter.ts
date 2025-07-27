import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorResponse: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      errorResponse = {
        success: false,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        ...(typeof exceptionResponse === 'object' ? exceptionResponse : { message: exceptionResponse }),
      };
    } else {
      // Beklenmeyen hatalar için
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        success: false,
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: 'Sunucuda beklenmeyen bir hata oluştu',
      };
    }

    // Hassas bilgileri içermeyen log
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${errorResponse.errorMessage || errorResponse.message}`,
      exception instanceof Error ? exception.stack : exception
    );

    // Development ortamında daha detaylı hata bilgisi
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      errorResponse.stack = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
} 
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Req,
  Logger,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { PaymentRequestDto, PaymentResponseDto, YapiKrediPaymentRequestDto, YapiKrediPaymentResponseDto } from './dto';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { YapiKrediPaymentService } from './services/yapi-kredi-payment.service';

@Controller('payment')
@UseInterceptors(ClassSerializerInterceptor, LoggingInterceptor)
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly yapiKrediPaymentService: YapiKrediPaymentService,
  ) {}

  /**
   * Yapı Kredi ödeme işlemi endpoint'i
   * POST /payment/pay
   */
  @Post('pay')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  async processYapiKrediPayment(
    @Body() paymentRequest: YapiKrediPaymentRequestDto,
    @Req() request: Request,
  ): Promise<YapiKrediPaymentResponseDto> {
    try {
      // Client IP'yi al
      const clientIp = this.getClientIp(request);
      
      this.logger.log(`Yapı Kredi payment request received from IP: ${clientIp}`);

      // Hassas bilgileri loglama (sadece genel bilgiler)
      this.logger.log(`Processing Yapı Kredi payment - Amount: ${paymentRequest.amount} ${paymentRequest.currency}, Order: ${paymentRequest.orderID || 'auto'}`);

      const result = await this.yapiKrediPaymentService.processPayment(paymentRequest, clientIp);
      
      return result;

    } catch (error) {
      this.logger.error('Yapı Kredi payment processing failed in controller', error);
      
      // Hata durumunda hassas bilgileri gizle
      return YapiKrediPaymentResponseDto.error({
        errorCode: 'CONTROLLER_ERROR',
        errorMessage: 'Ödeme işlemi başlatılamadı',
      });
    }
  }

  /**
   * Akbank ödeme işlemi endpoint'i (mevcut)
   * POST /payment/process
   */
  @Post('process')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  async processPayment(
    @Body() paymentRequest: PaymentRequestDto,
    @Req() request: Request,
  ): Promise<PaymentResponseDto> {
    try {
      // Client IP'yi al
      const clientIp = this.getClientIp(request);
      
      this.logger.log(`Akbank payment request received from IP: ${clientIp}`);

      // Hassas bilgileri loglama (sadece genel bilgiler)
      this.logger.log(`Processing Akbank payment - Amount: ${paymentRequest.amount} ${paymentRequest.currency}, Order: ${paymentRequest.orderId || 'auto'}`);

      const result = await this.paymentService.processPayment(paymentRequest, clientIp);
      
      return result;

    } catch (error) {
      this.logger.error('Akbank payment processing failed in controller', error);
      
      // Hata durumunda hassas bilgileri gizle
      return PaymentResponseDto.error({
        errorCode: 'CONTROLLER_ERROR',
        errorMessage: 'Ödeme işlemi başlatılamadı',
      });
    }
  }

  /**
   * Yapı Kredi ödeme durumu sorgulama endpoint'i
   * GET /payment/yapi-kredi/status/:orderID
   */
  @Get('yapi-kredi/status/:orderID')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  async getYapiKrediPaymentStatus(
    @Param('orderID') orderID: string,
  ): Promise<YapiKrediPaymentResponseDto> {
    try {
      this.logger.log(`Yapı Kredi payment status query for order: ${orderID}`);

      if (!orderID || orderID.trim() === '') {
        return YapiKrediPaymentResponseDto.error({
          errorCode: 'INVALID_ORDER_ID',
          errorMessage: 'Geçersiz sipariş numarası',
        });
      }

      return await this.yapiKrediPaymentService.queryPaymentStatus(orderID);

    } catch (error) {
      this.logger.error('Yapı Kredi payment status query failed in controller', error);
      
      return YapiKrediPaymentResponseDto.error({
        errorCode: 'QUERY_CONTROLLER_ERROR',
        errorMessage: 'Ödeme durumu sorgulanamadı',
      });
    }
  }

  /**
   * Akbank ödeme durumu sorgulama endpoint'i (mevcut)
   * GET /payment/status/:transactionId
   */
  @Get('status/:transactionId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  async getPaymentStatus(
    @Param('transactionId') transactionId: string,
  ): Promise<PaymentResponseDto> {
    try {
      this.logger.log(`Akbank payment status query for transaction: ${transactionId}`);

      if (!transactionId || transactionId.trim() === '') {
        return PaymentResponseDto.error({
          errorCode: 'INVALID_TRANSACTION_ID',
          errorMessage: 'Geçersiz işlem numarası',
        });
      }

      return await this.paymentService.queryPaymentStatus(transactionId);

    } catch (error) {
      this.logger.error('Akbank payment status query failed in controller', error);
      
      return PaymentResponseDto.error({
        errorCode: 'QUERY_CONTROLLER_ERROR',
        errorMessage: 'Ödeme durumu sorgulanamadı',
      });
    }
  }

  /**
   * Gateway bağlantı testi endpoint'i
   * GET /payment/ping
   */
  @Get('ping')
  @HttpCode(HttpStatus.OK)
  async pingGateway(): Promise<{ success: boolean; message: string; timestamp: Date }> {
    try {
      this.logger.log('Gateway ping request received');

      const result = await this.paymentService.ping();
      
      return {
        ...result,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error('Gateway ping failed in controller', error);
      
      return {
        success: false,
        message: 'Gateway ping başarısız',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Sağlık kontrolü endpoint'i
   * GET /payment/health
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{
    status: string;
    timestamp: Date;
    service: string;
    version: string;
  }> {
    this.logger.log('Health check request received');

    return {
      status: 'OK',
      timestamp: new Date(),
      service: 'Akbank Payment Service',
      version: '1.0.0',
    };
  }

  /**
   * Yapı Kredi test için örnek ödeme verisi döndürür
   * GET /payment/yapi-kredi/sample
   */
  @Get('yapi-kredi/sample')
  @HttpCode(HttpStatus.OK)
  getYapiKrediSamplePaymentData(): {
    message: string;
    sampleRequest: Partial<YapiKrediPaymentRequestDto>;
    note: string;
  } {
    return {
      message: 'Yapı Kredi için bu test veriler kullanılabilir',
      sampleRequest: {
        cardNumber: '4111111111111111', // Test kart numarası
        expiryDate: '12/25',
        cvv: '123',
        amount: 100.50,
        currency: 'TL',
        cardHolderName: 'Test Kullanici',
        installment: '00',
        orderID: 'YK_TEST_ORDER_123',
        description: 'Yapı Kredi test ödeme işlemi',
        customerEmail: 'test@example.com',
        extraPoint: '000000',
      },
      note: 'Bu veriler sadece Yapı Kredi test amaçlıdır. Gerçek kart bilgilerini kullanmayın.',
    };
  }

  /**
   * Akbank test için örnek ödeme verisi döndürür (mevcut)
   * GET /payment/sample
   */
  @Get('sample')
  @HttpCode(HttpStatus.OK)
  getSamplePaymentData(): {
    message: string;
    sampleRequest: Partial<PaymentRequestDto>;
    note: string;
  } {
    return {
      message: 'Akbank için bu test veriler kullanılabilir',
      sampleRequest: {
        cardNumber: '4111111111111111', // Test kart numarası
        expiryDate: '12/25',
        cvv: '123',
        amount: 100.50,
        currency: 'TRY',
        cardHolderName: 'Test Kullanici',
        installments: '1',
        orderId: 'AKBANK_TEST_ORDER_123',
        description: 'Akbank test ödeme işlemi',
        customerEmail: 'test@example.com',
      },
      note: 'Bu veriler sadece Akbank test amaçlıdır. Gerçek kart bilgilerini kullanmayın.',
    };
  }

  /**
   * Request'ten client IP'yi güvenli şekilde alır
   */
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
} 
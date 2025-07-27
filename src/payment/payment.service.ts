import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PaymentRequestDto, PaymentResponseDto } from './dto';
import { AkbankConfigService } from './services/akbank-config.service';
import { XmlService } from './services/xml.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private httpService: HttpService,
    private configService: AkbankConfigService,
    private xmlService: XmlService,
  ) {}

  /**
   * Ödeme işlemini gerçekleştirir
   */
  async processPayment(paymentRequest: PaymentRequestDto, clientIp?: string): Promise<PaymentResponseDto> {
    try {
      this.logger.log(`Processing payment for order: ${paymentRequest.orderId || 'auto-generated'}`);

      // Client IP'yi ekle
      if (clientIp) {
        paymentRequest.customerIp = clientIp;
      }

      // XML isteği oluştur
      const requestXml = this.xmlService.buildPaymentRequestXml(paymentRequest);

      // Akbank gateway'e istek gönder
      const responseXml = await this.sendPaymentRequest(requestXml);

      // Yanıtı parse et
      const parsedResponse = await this.xmlService.parsePaymentResponse(responseXml);

      // Yanıtı DTO'ya dönüştür
      const paymentResponse = this.buildPaymentResponse(parsedResponse, paymentRequest);

      this.logger.log(`Payment processed with result: ${paymentResponse.success ? 'SUCCESS' : 'FAILED'}`);
      
      return paymentResponse;

    } catch (error) {
      this.logger.error('Payment processing failed', error);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          errorCode: 'PAYMENT_ERROR',
          errorMessage: 'Ödeme işlemi sırasında bir hata oluştu',
          timestamp: new Date(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Akbank gateway'e HTTP POST isteği gönderir
   */
  private async sendPaymentRequest(xmlRequest: string): Promise<string> {
    try {
      const gatewayUrl = this.configService.currentGatewayUrl;
      
      this.logger.log(`Sending payment request to: ${gatewayUrl}`);

      const response = await firstValueFrom(
        this.httpService.post(gatewayUrl, xmlRequest, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': '',
            'User-Agent': 'Akbank-Payment-Service/1.0',
          },
          timeout: 30000,
        }),
      );

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.logger.log('Payment request sent successfully');
      return response.data;

    } catch (error) {
      this.logger.error('Failed to send payment request', error);
      
      if (error.code === 'ENOTFOUND') {
        throw new HttpException(
          'Ödeme gateway\'ine ulaşılamıyor',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        throw new HttpException(
          'Ödeme işlemi zaman aşımına uğradı',
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      throw new HttpException(
        'Ödeme gateway ile iletişim hatası',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Parse edilmiş XML yanıtını PaymentResponseDto'ya dönüştürür
   */
  private buildPaymentResponse(
    parsedResponse: any,
    originalRequest: PaymentRequestDto,
  ): PaymentResponseDto {
    try {
      // Akbank yanıt yapısına göre verileri çıkar
      const response = parsedResponse.response || parsedResponse;
      
      const responseCode = response.response_code || response.responseCode;
      const responseMessage = response.response_message || response.responseMessage;
      const transactionId = response.transaction_id || response.transactionId;
      const authCode = response.auth_code || response.authCode;
      const hostReference = response.host_reference || response.hostReference;

      // Başarılı işlem kontrolü (genellikle response code '00' başarılıdır)
      const isSuccess = responseCode === '00';

      if (isSuccess) {
        return PaymentResponseDto.success({
          transactionId: transactionId || `TXN_${Date.now()}`,
          responseCode,
          responseMessage: responseMessage || this.xmlService.getResponseMessage(responseCode),
          amount: originalRequest.amount,
          currency: originalRequest.currency,
          orderId: originalRequest.orderId,
          authCode,
          hostReference,
        });
      } else {
        return PaymentResponseDto.error({
          errorCode: responseCode || 'UNKNOWN_ERROR',
          errorMessage: responseMessage || this.xmlService.getResponseMessage(responseCode),
          responseCode,
          responseMessage,
          orderId: originalRequest.orderId,
        });
      }

    } catch (error) {
      this.logger.error('Failed to build payment response', error);
      
      return PaymentResponseDto.error({
        errorCode: 'RESPONSE_PARSE_ERROR',
        errorMessage: 'Ödeme yanıtı işlenirken hata oluştu',
      });
    }
  }

  /**
   * Ödeme durumu sorgulama (isteğe bağlı)
   */
  async queryPaymentStatus(transactionId: string): Promise<PaymentResponseDto> {
    try {
      this.logger.log(`Querying payment status for transaction: ${transactionId}`);

      // Durum sorgulama XML'i oluştur
      const queryXml = this.buildStatusQueryXml(transactionId);

      // Gateway'e istek gönder
      const responseXml = await this.sendPaymentRequest(queryXml);

      // Yanıtı parse et
      const parsedResponse = await this.xmlService.parsePaymentResponse(responseXml);

      // Dummy request objesi oluştur (query için)
      const dummyRequest: PaymentRequestDto = {
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        amount: 0,
        currency: 'TRY',
        cardHolderName: '',
      };

      return this.buildPaymentResponse(parsedResponse, dummyRequest);

    } catch (error) {
      this.logger.error('Payment status query failed', error);
      
      return PaymentResponseDto.error({
        errorCode: 'QUERY_ERROR',
        errorMessage: 'Ödeme durumu sorgulanırken hata oluştu',
      });
    }
  }

  /**
   * Durum sorgulama XML'i oluşturur
   */
  private buildStatusQueryXml(transactionId: string): string {
    // Bu method'u Akbank'ın durum sorgulama formatına göre implement edilmeli
    // Şu anda basit bir örnek implementasyon
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <request>
        <merchant_id>${this.configService.merchantId}</merchant_id>
        <password>${this.configService.password}</password>
        <terminal_id>${this.configService.terminalId}</terminal_id>
        <transaction_type>query</transaction_type>
        <transaction_id>${transactionId}</transaction_id>
      </request>`;
    
    return xml;
  }

  /**
   * Test bağlantısı için ping methodu
   */
  async ping(): Promise<{ success: boolean; message: string }> {
    try {
      const testUrl = this.configService.currentGatewayUrl;
      
      const response = await firstValueFrom(
        this.httpService.get(testUrl, {
          timeout: 10000,
        }),
      );

      return {
        success: true,
        message: `Gateway erişilebilir (HTTP ${response.status})`,
      };

    } catch (error) {
      return {
        success: false,
        message: `Gateway erişilemez: ${error.message}`,
      };
    }
  }
} 
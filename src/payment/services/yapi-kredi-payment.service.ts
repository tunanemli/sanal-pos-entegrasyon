import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { YapiKrediPaymentRequestDto, YapiKrediPaymentResponseDto } from '../dto';
import { YapiKrediConfigService } from './yapi-kredi-config.service';
import { YapiKrediXmlService } from './yapi-kredi-xml.service';

@Injectable()
export class YapiKrediPaymentService {
  private readonly logger = new Logger(YapiKrediPaymentService.name);

  constructor(
    private httpService: HttpService,
    private configService: YapiKrediConfigService,
    private xmlService: YapiKrediXmlService,
  ) {}

  /**
   * Yapı Kredi ödeme işlemini gerçekleştirir
   */
  async processPayment(paymentRequest: YapiKrediPaymentRequestDto, clientIp?: string): Promise<YapiKrediPaymentResponseDto> {
    try {
      this.logger.log(`Processing Yapı Kredi payment for order: ${paymentRequest.orderID || 'auto-generated'}`);

      // Client IP'yi ekle
      if (clientIp) {
        paymentRequest.customerIp = clientIp;
      }

      // XML isteği oluştur
      const requestXml = this.xmlService.buildPaymentRequestXml(paymentRequest);

      // Yapı Kredi gateway'e istek gönder
      const responseXml = await this.sendPaymentRequest(requestXml);

      // Yanıtı parse et
      const parsedResponse = await this.xmlService.parsePaymentResponse(responseXml);

      // Yanıtı DTO'ya dönüştür
      const paymentResponse = this.buildPaymentResponse(parsedResponse, paymentRequest);

      this.logger.log(`Yapı Kredi payment processed with result: ${paymentResponse.success ? 'SUCCESS' : 'FAILED'}`);
      
      return paymentResponse;

    } catch (error) {
      this.logger.error('Yapı Kredi payment processing failed', error);
      
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
   * Yapı Kredi gateway'e HTTP POST isteği gönderir
   */
  private async sendPaymentRequest(xmlRequest: string): Promise<string> {
    try {
      const gatewayUrl = this.configService.currentGatewayUrl;
      
      this.logger.log(`Sending Yapı Kredi payment request to: ${gatewayUrl}`);

      const response = await firstValueFrom(
        this.httpService.post(gatewayUrl, xmlRequest, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': xmlRequest.length.toString(),
            'User-Agent': 'YapiKredi-Payment-Service/1.0',
          },
          timeout: 30000,
        }),
      );

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.logger.log('Yapı Kredi payment request sent successfully');
      return response.data;

    } catch (error) {
      this.logger.error('Failed to send Yapı Kredi payment request', error);
      
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
   * Parse edilmiş XML yanıtını YapiKrediPaymentResponseDto'ya dönüştürür
   */
  private buildPaymentResponse(
    parsedResponse: any,
    originalRequest: YapiKrediPaymentRequestDto,
  ): YapiKrediPaymentResponseDto {
    try {
      // Yapı Kredi yanıt yapısına göre verileri çıkar
      const response = parsedResponse.posnetResponse || parsedResponse;
      const oosResponseData = response.oosResponseData || {};
      
      const approved = oosResponseData.approved;
      const respCode = oosResponseData.respCode;
      const respText = oosResponseData.respText;
      const authCode = oosResponseData.authCode;
      const hostLogKey = oosResponseData.hostLogKey;
      const orderID = originalRequest.orderID;

      // Başarılı işlem kontrolü (approved = 1 ise başarılı)
      const isSuccess = approved === '1' || approved === 1;

      if (isSuccess) {
        return YapiKrediPaymentResponseDto.success({
          transactionId: hostLogKey || `YK_TXN_${Date.now()}`,
          responseCode: respCode || '00',
          responseText: respText || this.xmlService.getResponseMessage(respCode || '00'),
          amount: originalRequest.amount,
          currency: originalRequest.currency,
          orderID,
          authCode,
          hostLogKey,
          approved: approved?.toString(),
        });
      } else {
        return YapiKrediPaymentResponseDto.error({
          errorCode: respCode || 'UNKNOWN_ERROR',
          errorMessage: respText || this.xmlService.getResponseMessage(respCode || 'UNKNOWN_ERROR'),
          responseCode: respCode,
          responseText: respText,
          orderID,
          respCode,
          respText,
        });
      }

    } catch (error) {
      this.logger.error('Failed to build Yapı Kredi payment response', error);
      
      return YapiKrediPaymentResponseDto.error({
        errorCode: 'RESPONSE_PARSE_ERROR',
        errorMessage: 'Ödeme yanıtı işlenirken hata oluştu',
      });
    }
  }

  /**
   * Ödeme durumu sorgulama
   */
  async queryPaymentStatus(orderID: string): Promise<YapiKrediPaymentResponseDto> {
    try {
      this.logger.log(`Querying Yapı Kredi payment status for order: ${orderID}`);

      // Durum sorgulama XML'i oluştur
      const queryXml = this.buildStatusQueryXml(orderID);

      // Gateway'e istek gönder
      const responseXml = await this.sendPaymentRequest(queryXml);

      // Yanıtı parse et
      const parsedResponse = await this.xmlService.parsePaymentResponse(responseXml);

      // Dummy request objesi oluştur (query için)
      const dummyRequest: YapiKrediPaymentRequestDto = {
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        amount: 0,
        currency: 'TL',
        cardHolderName: '',
        orderID,
      };

      return this.buildPaymentResponse(parsedResponse, dummyRequest);

    } catch (error) {
      this.logger.error('Yapı Kredi payment status query failed', error);
      
      return YapiKrediPaymentResponseDto.error({
        errorCode: 'QUERY_ERROR',
        errorMessage: 'Ödeme durumu sorgulanırken hata oluştu',
      });
    }
  }

  /**
   * Durum sorgulama XML'i oluşturur
   */
  private buildStatusQueryXml(orderID: string): string {
    // Yapı Kredi durum sorgulama için basit XML formatı
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <posnetRequest>
        <mid>${this.configService.merchantId}</mid>
        <tid>${this.configService.terminalNo}</tid>
        <tranDateRequired>1</tranDateRequired>
        <orderStatusRequestData>
          <orderID>${orderID}</orderID>
        </orderStatusRequestData>
      </posnetRequest>`;
    
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
        message: `Yapı Kredi Gateway erişilebilir (HTTP ${response.status})`,
      };

    } catch (error) {
      return {
        success: false,
        message: `Yapı Kredi Gateway erişilemez: ${error.message}`,
      };
    }
  }
} 
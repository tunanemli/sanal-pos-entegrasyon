import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class YapiKrediConfigService {
  constructor(private configService: ConfigService) {}

  get gatewayUrl(): string {
    return this.configService.get<string>(
      'YAPIKREDI_GATEWAY_URL',
      'https://setmpos.ykb.com/PosnetWebService/XML'
    );
  }

  get testGatewayUrl(): string {
    return this.configService.get<string>(
      'YAPIKREDI_TEST_GATEWAY_URL',
      'https://setmpos.ykb.com/PosnetWebService/XML'
    );
  }

  get posNetId(): string {
    const posNetId = this.configService.get<string>('YAPIKREDI_POSNET_ID');
    if (!posNetId) {
      throw new Error('YAPIKREDI_POSNET_ID is required');
    }
    return posNetId;
  }

  get terminalNo(): string {
    const terminalNo = this.configService.get<string>('YAPIKREDI_TERMINAL_NO');
    if (!terminalNo) {
      throw new Error('YAPIKREDI_TERMINAL_NO is required');
    }
    return terminalNo;
  }

  get merchantId(): string {
    const merchantId = this.configService.get<string>('YAPIKREDI_MERCHANT_ID');
    if (!merchantId) {
      throw new Error('YAPIKREDI_MERCHANT_ID is required');
    }
    return merchantId;
  }

  get encKey(): string {
    const encKey = this.configService.get<string>('YAPIKREDI_ENC_KEY');
    if (!encKey) {
      throw new Error('YAPIKREDI_ENC_KEY is required');
    }
    return encKey;
  }

  get isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  get currentGatewayUrl(): string {
    return this.isProduction ? this.gatewayUrl : this.testGatewayUrl;
  }

  get logSensitiveData(): boolean {
    return this.configService.get<string>('LOG_SENSITIVE_DATA') === 'true';
  }
} 
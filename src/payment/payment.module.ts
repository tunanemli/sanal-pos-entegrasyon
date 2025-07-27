import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { YapiKrediConfigService } from './services/yapi-kredi-config.service';
import { XmlService } from './services/xml.service';
import { YapiKrediXmlService } from './services/yapi-kredi-xml.service';
import { YapiKrediPaymentService } from './services/yapi-kredi-payment.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService, 
    YapiKrediConfigService, 
    XmlService,
    YapiKrediXmlService,
    YapiKrediPaymentService,
    LoggingInterceptor,
    RateLimitGuard,
  ],
  exports: [PaymentService, YapiKrediPaymentService],
})
export class PaymentModule {} 
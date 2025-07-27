import { Injectable, Logger } from '@nestjs/common';
import * as xmlbuilder from 'xmlbuilder';
import * as xml2js from 'xml2js';
import * as crypto from 'crypto';
import { YapiKrediPaymentRequestDto } from '../dto/yapi-kredi-payment-request.dto';
import { YapiKrediConfigService } from './yapi-kredi-config.service';

@Injectable()
export class YapiKrediXmlService {
  private readonly logger = new Logger(YapiKrediXmlService.name);

  constructor(private configService: YapiKrediConfigService) {}

  /**
   * Yapı Kredi Sanal POS için XML ödeme isteği oluşturur
   */
  buildPaymentRequestXml(paymentData: YapiKrediPaymentRequestDto): string {
    try {
      // Kart numarasından son kullanım tarihini ayır (MM/YY formatından YYMM'ye)
      const [month, year] = paymentData.expiryDate.split('/');
      const expDate = `${year}${month}`;

      // Order ID yoksa timestamp ile oluştur
      const orderID = paymentData.orderID || `YK${Date.now()}`;

      // Tutarı kuruş cinsine çevir
      const amountInKurus = Math.round(paymentData.amount * 100);

      // MAC değeri için string oluştur
      const macString = this.buildMacString(
        this.configService.posNetId,
        this.configService.terminalNo,
        paymentData.cardNumber,
        amountInKurus.toString(),
        paymentData.currency,
        this.configService.merchantId,
        this.configService.encKey
      );

      // SHA1 hash hesapla
      const mac = this.calculateSHA1(macString);

      const xml = xmlbuilder.create('posnetRequest', { version: '1.0', encoding: 'UTF-8' })
        .ele('mid', this.configService.merchantId)
        .up()
        .ele('tid', this.configService.terminalNo)
        .up()
        .ele('oosRequestData')
          .ele('posnetid', this.configService.posNetId)
          .up()
          .ele('ccno', paymentData.cardNumber)
          .up()
          .ele('expDate', expDate)
          .up()
          .ele('cvc', paymentData.cvv)
          .up()
          .ele('amount', amountInKurus.toString())
          .up()
          .ele('currencyCode', paymentData.currency)
          .up()
          .ele('installment', paymentData.installment || '00')
          .up()
          .ele('extraPoint', paymentData.extraPoint || '000000')
          .up()
          .ele('orderID', orderID)
          .up()
          .ele('mac', mac)
          .up()
        .up();

      const xmlString = xml.end({ pretty: true });
      
      if (!this.configService.logSensitiveData) {
        this.logger.log('Yapı Kredi payment request XML generated successfully');
      } else {
        this.logger.log(`Yapı Kredi payment request XML: ${this.maskSensitiveData(xmlString)}`);
      }

      return xmlString;
    } catch (error) {
      this.logger.error('Error building Yapı Kredi payment request XML', error);
      throw new Error('Failed to build Yapı Kredi payment request XML');
    }
  }

  /**
   * Yapı Kredi'den gelen XML yanıtı parse eder
   */
  async parsePaymentResponse(xmlResponse: string): Promise<any> {
    try {
      const parser = new xml2js.Parser({ 
        explicitArray: false,
        ignoreAttrs: true,
        trim: true
      });

      const result = await parser.parseStringPromise(xmlResponse);
      
      if (!this.configService.logSensitiveData) {
        this.logger.log('Yapı Kredi payment response XML parsed successfully');
      } else {
        this.logger.log(`Parsed Yapı Kredi payment response: ${JSON.stringify(result, null, 2)}`);
      }

      return result;
    } catch (error) {
      this.logger.error('Error parsing Yapı Kredi payment response XML', error);
      throw new Error('Failed to parse Yapı Kredi payment response XML');
    }
  }

  /**
   * MAC string oluşturur (SHA1 hash için)
   */
  private buildMacString(
    posnetid: string,
    terminalNo: string,
    ccno: string,
    amount: string,
    currencyCode: string,
    merchantId: string,
    encKey: string
  ): string {
    // Yapı Kredi MAC formatı: posnetid;terminalNo;ccno;amount;currencyCode;merchantId;encKey
    return `${posnetid};${terminalNo};${ccno};${amount};${currencyCode};${merchantId};${encKey}`;
  }

  /**
   * SHA1 hash hesaplar
   */
  private calculateSHA1(data: string): string {
    return crypto.createHash('sha1').update(data, 'utf8').digest('hex').toUpperCase();
  }

  /**
   * XML'deki hassas verileri maskeler (loglama için)
   */
  private maskSensitiveData(xmlString: string): string {
    return xmlString
      .replace(/<ccno>.*?<\/ccno>/g, '<ccno>****-****-****-****</ccno>')
      .replace(/<cvc>.*?<\/cvc>/g, '<cvc>***</cvc>')
      .replace(/<mac>.*?<\/mac>/g, '<mac>***MASKED***</mac>');
  }

  /**
   * Yapı Kredi yanıt kodlarını yorumlar
   */
  getResponseMessage(responseCode: string): string {
    const responseCodes: { [key: string]: string } = {
      '00': 'İşlem başarılı',
      '01': 'Bankanızı arayınız',
      '02': 'Bankanızı arayınız',
      '03': 'Geçersiz işyeri',
      '04': 'Kart el koydurma',
      '05': 'İşlem onaylanmadı',
      '06': 'Hata',
      '07': 'Kart el koydurma',
      '08': 'Kimlik doğrulama',
      '09': 'Geçersiz işlem',
      '10': 'Geçersiz tutar',
      '11': 'Geçersiz kart numarası',
      '12': 'Geçersiz işlem',
      '13': 'Geçersiz tutar',
      '14': 'Geçersiz kart numarası',
      '15': 'Geçersiz banka',
      '19': 'Tekrar deneyin',
      '21': 'İptal edilmedi',
      '25': 'Kayıt bulunamadı',
      '28': 'Orijinal red',
      '30': 'Mesaj formatı hatası',
      '32': 'Dosyaya ulaşılamıyor',
      '33': 'Süresi geçmiş kart',
      '34': 'Sahte kart',
      '36': 'Kısıtlanmış kart',
      '37': 'Güvenlik ihlali',
      '38': 'Pin deneme sayısı aşıldı',
      '39': 'Kredi hesabı yok',
      '41': 'Kayıp kart',
      '43': 'Çalıntı kart',
      '51': 'Yetersiz bakiye',
      '52': 'Hesap bulunamadı',
      '53': 'Hesap bulunamadı',
      '54': 'Süresi geçmiş kart',
      '55': 'Hatalı PIN',
      '56': 'Kart kaydı yok',
      '57': 'İzin verilmeyen işlem',
      '58': 'Terminal işlem yapamaz',
      '61': 'Para çekme limiti aşıldı',
      '62': 'Kısıtlanmış kart',
      '63': 'Güvenlik ihlali',
      '65': 'Günlük işlem adedi aşıldı',
      '75': 'Pin deneme sayısı aşıldı',
      '76': 'Key sync hatası',
      '77': 'İnconsistent data',
      '78': 'Kart kaydı yok',
      '81': 'Network error',
      '82': 'Time-out',
      '83': 'İşlem tamamlanamadı',
      '89': 'MAC hatası',
      '91': 'Banka cevap vermiyor',
      '92': 'Routing hatası',
      '93': 'İşlem tamamlanamadı',
      '96': 'Sistem hatası',
      '99': 'Tanımlanmamış hata',
      'CORE-2008': 'Geçersiz kart numarası',
      'CORE-2010': 'CVV hatalı',
      'CORE-2016': 'Yetkilendirme hatası'
    };

    return responseCodes[responseCode] || `Bilinmeyen hata kodu: ${responseCode}`;
  }
} 
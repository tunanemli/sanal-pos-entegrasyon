import { Injectable, Logger } from '@nestjs/common';
import * as xmlbuilder from 'xmlbuilder';
import * as xml2js from 'xml2js';
import { PaymentRequestDto } from '../dto/payment-request.dto';
import { AkbankConfigService } from './akbank-config.service';

@Injectable()
export class XmlService {
  private readonly logger = new Logger(XmlService.name);

  constructor(private configService: AkbankConfigService) {}

  /**
   * Akbank Sanal POS için XML ödeme isteği oluşturur
   */
  buildPaymentRequestXml(paymentData: PaymentRequestDto): string {
    try {
      // Kart numarasından son kullanım tarihini ayır (MM/YY formatından MMYY'ye)
      const [month, year] = paymentData.expiryDate.split('/');
      const expiryDate = `${month}${year}`;

      // Order ID yoksa timestamp ile oluştur
      const orderId = paymentData.orderId || `ORD_${Date.now()}`;

      const xml = xmlbuilder.create('request', { version: '1.0', encoding: 'UTF-8' })
        .ele('merchant_id', this.configService.merchantId)
        .up()
        .ele('password', this.configService.password)
        .up()
        .ele('terminal_id', this.configService.terminalId)
        .up()
        .ele('transaction_type', 'sale')
        .up()
        .ele('order_id', orderId)
        .up()
        .ele('amount', (paymentData.amount * 100).toString()) // Kuruş cinsinden
        .up()
        .ele('currency', paymentData.currency)
        .up()
        .ele('installments', paymentData.installments || '1')
        .up()
        .ele('card_number', paymentData.cardNumber)
        .up()
        .ele('expiry_date', expiryDate)
        .up()
        .ele('cvv', paymentData.cvv)
        .up()
        .ele('card_holder_name', paymentData.cardHolderName)
        .up();

      // Opsiyonel alanlar
      if (paymentData.description) {
        xml.ele('description', paymentData.description).up();
      }

      if (paymentData.customerIp) {
        xml.ele('customer_ip', paymentData.customerIp).up();
      }

      if (paymentData.customerEmail) {
        xml.ele('customer_email', paymentData.customerEmail).up();
      }

      const xmlString = xml.end({ pretty: true });
      
      if (!this.configService.logSensitiveData) {
        this.logger.log('Payment request XML generated successfully');
      } else {
        this.logger.log(`Payment request XML: ${this.maskSensitiveData(xmlString)}`);
      }

      return xmlString;
    } catch (error) {
      this.logger.error('Error building payment request XML', error);
      throw new Error('Failed to build payment request XML');
    }
  }

  /**
   * Akbank'tan gelen XML yanıtı parse eder
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
        this.logger.log('Payment response XML parsed successfully');
      } else {
        this.logger.log(`Parsed payment response: ${JSON.stringify(result, null, 2)}`);
      }

      return result;
    } catch (error) {
      this.logger.error('Error parsing payment response XML', error);
      throw new Error('Failed to parse payment response XML');
    }
  }

  /**
   * XML'deki hassas verileri maskeler (loglama için)
   */
  private maskSensitiveData(xmlString: string): string {
    return xmlString
      .replace(/<card_number>.*?<\/card_number>/g, '<card_number>****-****-****-****</card_number>')
      .replace(/<cvv>.*?<\/cvv>/g, '<cvv>***</cvv>')
      .replace(/<password>.*?<\/password>/g, '<password>***</password>');
  }

  /**
   * Akbank yanıt kodlarını yorumlar
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
      '99': 'Tanımlanmamış hata'
    };

    return responseCodes[responseCode] || `Bilinmeyen hata kodu: ${responseCode}`;
  }
} 
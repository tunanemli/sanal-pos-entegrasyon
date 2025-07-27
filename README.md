# Multi-Bank Sanal POS NestJS Integration Service

Bu proje, Akbank ve Yapı Kredi Sanal POS sistemleri ile entegre olabilen güvenli ve ölçeklenebilir bir ödeme servisidir. NestJS framework'ü kullanılarak TypeScript ile geliştirilmiştir.

## 🚀 Özellikler

- ✅ **Yapı Kredi Sanal POS entegrasyonu** (SHA1 hash ile)
- ✅ **Akbank Sanal POS entegrasyonu** (mevcut)
- ✅ XML istek/yanıt işleme
- ✅ Hassas veri maskeleme ve güvenlik
- ✅ Rate limiting (hız sınırlama)
- ✅ Detaylı logging ve hata yönetimi
- ✅ Ödeme durumu sorgulama
- ✅ Validation ve sanitization
- ✅ Health check endpoint'leri
- ✅ Test desteği

## 📋 Gereksinimler

- Node.js (v16 veya üzeri)
- npm veya yarn
- **Yapı Kredi Sanal POS hesabı** (PosNet ID, Terminal No, Merchant ID, Encryption Key)
- **Akbank Sanal POS hesabı** (Merchant ID, Password, Terminal ID)

## 🛠️ Kurulum

1. **Projeyi klonlayın:**
   ```bash
   git clone <repository-url>
   cd akbank-payment-service
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

3. **Environment dosyasını oluşturun:**
   ```bash
   cp .env.example .env
   ```

4. **Environment değişkenlerini düzenleyin:**
   ```env
   # Yapı Kredi Sanal POS API Configuration
   YAPIKREDI_GATEWAY_URL=https://setmpos.ykb.com/PosnetWebService/XML
   YAPIKREDI_TEST_GATEWAY_URL=https://setmpos.ykb.com/PosnetWebService/XML
   YAPIKREDI_POSNET_ID=your_posnet_id
   YAPIKREDI_TERMINAL_NO=your_terminal_no
   YAPIKREDI_MERCHANT_ID=your_merchant_id
   YAPIKREDI_ENC_KEY=your_encryption_key

   # Akbank Sanal POS API Configuration (Mevcut)
   AKBANK_GATEWAY_URL=https://www.sanalakpos.com/default.aspx
   AKBANK_TEST_GATEWAY_URL=https://www.sanalakpos.com/default.aspx
   AKBANK_MERCHANT_ID=your_merchant_id
   AKBANK_PASSWORD=your_password
   AKBANK_TERMINAL_ID=your_terminal_id

   # Application Configuration
   PORT=3000
   NODE_ENV=development

   # Security
   LOG_SENSITIVE_DATA=false
   ```

## 🚀 Çalıştırma

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

### Debug Mode
```bash
npm run start:debug
```

## 📡 API Endpoints

### Yapı Kredi Ödeme İşlemleri

#### POST /api/payment/pay
Yapı Kredi Sanal POS ile ödeme işlemi gerçekleştirir.

**İstek Örneği:**
```json
{
  "cardNumber": "4111111111111111",
  "expiryDate": "12/25",
  "cvv": "123",
  "amount": 100.50,
  "currency": "TL",
  "cardHolderName": "Test Kullanici",
  "installment": "00",
  "orderID": "YK_ORDER_123",
  "description": "Yapı Kredi test ödeme",
  "customerEmail": "test@example.com",
  "extraPoint": "000000"
}
```

**Yanıt Örneği:**
```json
{
  "success": true,
  "transactionId": "YK_TXN_1234567890",
  "responseCode": "00",
  "responseText": "İşlem başarılı",
  "amount": 100.50,
  "currency": "TL",
  "orderID": "YK_ORDER_123",
  "authCode": "123456",
  "hostLogKey": "LOG123456",
  "approved": "1",
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

#### GET /api/payment/yapi-kredi/status/:orderID
Yapı Kredi ödeme durumu sorgular.

**Yanıt Örneği:**
```json
{
  "success": true,
  "transactionId": "YK_TXN_1234567890",
  "responseCode": "00", 
  "responseText": "İşlem başarılı",
  "orderID": "YK_ORDER_123",
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

### Akbank Ödeme İşlemleri (Mevcut)

#### POST /api/payment/process
Akbank Sanal POS ile ödeme işlemi gerçekleştirir.

#### GET /api/payment/status/:transactionId
Akbank ödeme durumu sorgular.

### Utility Endpoints

#### GET /api/payment/health
Servis sağlık kontrolü.

#### GET /api/payment/ping
Gateway bağlantı testi.

#### GET /api/payment/yapi-kredi/sample
Yapı Kredi test verisi örneği.

#### GET /api/payment/sample
Akbank test verisi örneği.

## 🔒 Güvenlik Özellikleri

### 1. Hassas Veri Maskeleme
- Kart numaraları, CVV ve şifreler logda maskelenir
- Sadece gerekli bilgiler gösterilir

### 2. Rate Limiting
- IP bazlı istek sınırlaması
- 10 dakikada maksimum 10 istek

### 3. Validation
- Tüm giriş verileri doğrulanır
- Class-validator kullanılır

### 4. Error Handling
- Global exception filter
- Güvenli hata mesajları
- Stack trace gizleme (production)

## 🧪 Test

```bash
# Unit testler
npm run test

# Test coverage
npm run test:cov

# E2E testler
npm run test:e2e
```

## 📊 Monitoring ve Logging

### Log Levels
- `LOG`: Genel bilgi
- `WARN`: Uyarı mesajları
- `ERROR`: Hata mesajları

### Log Formatı
```
[RequestID] METHOD URL - STATUS - DURATION - MESSAGE
```

### Hassas Veri Maskeleme
```
cardNumber: 411111****1111
cvv: ***
expiryDate: XX/XX
```

## 🔧 Development

### Kod Yapısı
```
src/
├── main.ts                 # Uygulama giriş noktası
├── app.module.ts          # Ana modül
└── payment/
    ├── payment.module.ts   # Payment modülü
    ├── payment.controller.ts # REST controller
    ├── payment.service.ts  # İş mantığı
    ├── dto/               # Data Transfer Objects
    ├── services/          # Yardımcı servisler
    ├── interceptors/      # Logging interceptor
    ├── guards/           # Rate limiting guard
    └── filters/          # Exception filter
```

### Yeni Özellik Ekleme
1. DTO'ları güncelle
2. Service'e method ekle
3. Controller'a endpoint ekle
4. Test yaz

## 🏗️ Docker Desteği

```dockerfile
# Dockerfile örneği
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

## 📝 Yapı Kredi Entegrasyon Notları

### XML Format
- İstek ve yanıt XML formatında (PosNet API)
- Encoding: UTF-8
- Content-Type: application/x-www-form-urlencoded
- **SHA1 hash** ile MAC değeri hesaplanır

### SHA1 MAC Hesaplama
```
MAC = SHA1(posnetid;terminalNo;ccno;amount;currencyCode;merchantId;encKey)
```

### Yanıt Kodları
- `approved = 1`: Başarılı
- `approved = 0`: Başarısız
- `00`: İşlem başarılı
- `CORE-2008`: Geçersiz kart numarası
- `CORE-2010`: CVV hatalı
- Diğer kodlar için service içinde mapping var

### Test Kartları
```
Kart Numarası: 4111111111111111
Son Kullanım: 12/25
CVV: 123
```

## 📝 Akbank Entegrasyon Notları (Mevcut)

### XML Format
- İstek ve yanıt XML formatında
- Encoding: UTF-8
- Content-Type: text/xml

### Test Kartları
```
Kart Numarası: 4111111111111111
Son Kullanım: 12/25
CVV: 123
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆘 Destek

Sorularınız için:
- GitHub Issues
- Email: mtunanemli@gmail.com

## 📈 Sürüm Geçmişi

### v1.0.0
- İlk sürüm
- Akbank Sanal POS entegrasyonu
- Temel güvenlik özellikleri
- Rate limiting
- Logging ve monitoring 
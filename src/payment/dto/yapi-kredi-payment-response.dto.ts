export class YapiKrediPaymentResponseDto {
  success: boolean;
  transactionId?: string;
  responseCode?: string;
  responseText?: string;
  amount?: number;
  currency?: string;
  orderID?: string;
  authCode?: string;
  hostLogKey?: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
  approved?: string;
  respCode?: string;
  respText?: string;

  constructor(partial: Partial<YapiKrediPaymentResponseDto>) {
    Object.assign(this, partial);
    this.timestamp = new Date();
  }

  static success(data: {
    transactionId: string;
    responseCode: string;
    responseText: string;
    amount: number;
    currency: string;
    orderID?: string;
    authCode?: string;
    hostLogKey?: string;
    approved?: string;
  }): YapiKrediPaymentResponseDto {
    return new YapiKrediPaymentResponseDto({
      success: true,
      ...data,
    });
  }

  static error(data: {
    errorCode: string;
    errorMessage: string;
    responseCode?: string;
    responseText?: string;
    orderID?: string;
    respCode?: string;
    respText?: string;
  }): YapiKrediPaymentResponseDto {
    return new YapiKrediPaymentResponseDto({
      success: false,
      ...data,
    });
  }
} 
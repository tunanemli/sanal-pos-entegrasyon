export class PaymentResponseDto {
  success: boolean;
  transactionId?: string;
  responseCode?: string;
  responseMessage?: string;
  amount?: number;
  currency?: string;
  orderId?: string;
  bankResponseCode?: string;
  bankResponseMessage?: string;
  authCode?: string;
  hostReference?: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;

  constructor(partial: Partial<PaymentResponseDto>) {
    Object.assign(this, partial);
    this.timestamp = new Date();
  }

  static success(data: {
    transactionId: string;
    responseCode: string;
    responseMessage: string;
    amount: number;
    currency: string;
    orderId?: string;
    authCode?: string;
    hostReference?: string;
  }): PaymentResponseDto {
    return new PaymentResponseDto({
      success: true,
      ...data,
    });
  }

  static error(data: {
    errorCode: string;
    errorMessage: string;
    responseCode?: string;
    responseMessage?: string;
    orderId?: string;
  }): PaymentResponseDto {
    return new PaymentResponseDto({
      success: false,
      ...data,
    });
  }
} 
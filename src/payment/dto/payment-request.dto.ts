import { IsString, IsNumber, IsNotEmpty, Length, Matches, IsOptional, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class PaymentRequestDto {
  @IsString()
  @IsNotEmpty()
  @Length(13, 19)
  @Matches(/^\d+$/, { message: 'Card number must contain only digits' })
  cardNumber: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { 
    message: 'Expiry date must be in MM/YY format' 
  })
  expiryDate: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 4)
  @Matches(/^\d+$/, { message: 'CVV must contain only digits' })
  cvv: string;

  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  currency: string = 'TRY';

  @IsString()
  @IsNotEmpty()
  cardHolderName: string;

  @IsOptional()
  @IsString()
  installments?: string = '1';

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  customerIp?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;
} 
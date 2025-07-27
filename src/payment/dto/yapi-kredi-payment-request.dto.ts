import { IsString, IsNumber, IsNotEmpty, Length, Matches, IsOptional, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class YapiKrediPaymentRequestDto {
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
  currency: string = 'TL';

  @IsString()
  @IsNotEmpty()
  cardHolderName: string;

  @IsOptional()
  @IsString()
  installment?: string = '00';

  @IsOptional()
  @IsString()
  orderID?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  customerIp?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  extraPoint?: string = '000000';

  @IsOptional()
  @IsString()
  ccno?: string;

  @IsOptional()
  @IsString()
  expDate?: string;

  @IsOptional()
  @IsString()
  cvc?: string;
} 
import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class ValidateDiscountDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  orderTotal: number;
}

export class ValidateDiscountResponseDto {
  valid: boolean;
  discount?: {
    uuid: string;
    code: string;
    description: string;
    type: string;
    value: number;
    discountAmount: number;
    finalTotal: number;
    discountAmountVes?: number;
    finalTotalVes?: number;
  };
  error?: string;
}

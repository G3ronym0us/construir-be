import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  IsDate,
  IsInt,
  Length,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DiscountType } from '../discount.entity';

export class CreateDiscountDto {
  @IsNotEmpty()
  @IsString()
  @Length(3, 50)
  @Matches(/^[A-Z0-9-_]+$/, {
    message: 'Code must contain only uppercase letters, numbers, hyphens and underscores',
  })
  code: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;

  @IsNotEmpty()
  @IsEnum(DiscountType)
  type: DiscountType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Transform(({ value, obj }) => {
    if (obj.type === DiscountType.PERCENTAGE) {
      return Math.min(value, 100); // Max 100% discount
    }
    return value;
  })
  value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

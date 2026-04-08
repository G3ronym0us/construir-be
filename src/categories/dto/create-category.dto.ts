import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @IsNotEmpty()
  @Transform(({ value }) => (value ? value.trim() : value))
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  customName?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? value.trim() : value))
  @IsString()
  externalCode?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return ['true', '1'].includes(value.toLowerCase());
    }
    return value;
  })
  isFeatured?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return ['true', '1'].includes(value.toLowerCase());
    }
    return value;
  })
  visible?: boolean;
}

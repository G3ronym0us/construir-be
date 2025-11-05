import { IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class UploadImageDto {
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsNumber()
  order?: number;
}

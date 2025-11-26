import { IsOptional, IsString } from 'class-validator';

export class CreatePageViewDto {
  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  referrer?: string;
}

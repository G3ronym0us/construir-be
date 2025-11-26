import { IsArray, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateWebhookDto {
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsNotEmpty()
  @IsArray()
  events: string[];

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsArray()
  events?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}

import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiKeyPermission } from '../api-key.entity';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  description: string;

  @IsEnum(ApiKeyPermission)
  permissions: ApiKeyPermission;
}

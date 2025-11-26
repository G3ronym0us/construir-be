import { SetMetadata } from '@nestjs/common';
import { ApiKeyPermission } from '../api-key.entity';

export const RequireApiKeyPermission = (permission: ApiKeyPermission) =>
  SetMetadata('apiKeyPermission', permission);

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from '../api-keys.service';
import { ApiKeyPermission } from '../api-key.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private apiKeysService: ApiKeysService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const consumerKey = this.extractConsumerKey(request);
    const consumerSecret = this.extractConsumerSecret(request);

    if (!consumerKey || !consumerSecret) {
      throw new UnauthorizedException('Missing API credentials');
    }

    const apiKey = await this.apiKeysService.validateApiKey(
      consumerKey,
      consumerSecret,
    );

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API credentials');
    }

    const requiredPermission = this.reflector.get<ApiKeyPermission>(
      'apiKeyPermission',
      context.getHandler(),
    );

    if (requiredPermission && !this.hasPermission(apiKey, requiredPermission)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    request.apiKey = apiKey;

    return true;
  }

  private extractConsumerKey(request: any): string | null {
    const authHeader = request.headers['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const credentials = authHeader.substring(7);
      const [key] = credentials.split(':');
      return key;
    }

    return request.query.consumer_key || request.headers['x-consumer-key'];
  }

  private extractConsumerSecret(request: any): string | null {
    const authHeader = request.headers['authorization'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const credentials = authHeader.substring(7);
      const [, secret] = credentials.split(':');
      return secret;
    }

    return (
      request.query.consumer_secret || request.headers['x-consumer-secret']
    );
  }

  private hasPermission(apiKey: any, required: ApiKeyPermission): boolean {
    if (apiKey.permissions === ApiKeyPermission.READ_WRITE) {
      return true;
    }

    if (
      required === ApiKeyPermission.READ &&
      apiKey.permissions === ApiKeyPermission.READ
    ) {
      return true;
    }

    if (
      required === ApiKeyPermission.WRITE &&
      apiKey.permissions === ApiKeyPermission.WRITE
    ) {
      return true;
    }

    return false;
  }
}

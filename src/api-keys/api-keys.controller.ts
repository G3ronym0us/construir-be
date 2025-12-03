import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('admin/api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  async create(@Body() createApiKeyDto: CreateApiKeyDto) {
    const result = await this.apiKeysService.create(
      createApiKeyDto.description,
      createApiKeyDto.permissions,
    );

    return {
      message: 'API Key created successfully',
      apiKey: result.apiKey,
      consumerSecret: result.consumerSecret,
      warning: 'Save the consumer_secret securely. It will not be shown again.',
    };
  }

  @Get()
  async findAll() {
    return this.apiKeysService.findAll();
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string) {
    return this.apiKeysService.findByUuid(uuid);
  }

  @Post(':uuid/revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(@Param('uuid') uuid: string) {
    await this.apiKeysService.revoke(uuid);
    return {
      message: 'API Key revoked successfully',
    };
  }

  @Delete(':uuid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('uuid') uuid: string) {
    await this.apiKeysService.delete(uuid);
  }
}

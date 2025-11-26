import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/create-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('admin/webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  async create(@Body() createDto: CreateWebhookDto) {
    const webhook = await this.webhooksService.create(
      createDto.url,
      createDto.events,
      createDto.secret,
      createDto.description,
    );

    return {
      message: 'Webhook created successfully',
      webhook,
      warning: 'Save the webhook secret securely for signature verification.',
    };
  }

  @Get()
  async findAll() {
    return this.webhooksService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.webhooksService.findOne(parseInt(id));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateWebhookDto) {
    return this.webhooksService.update(parseInt(id), updateDto);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Param('id') id: string) {
    await this.webhooksService.update(parseInt(id), { active: true });
    return { message: 'Webhook activated successfully' };
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  async deactivate(@Param('id') id: string) {
    await this.webhooksService.update(parseInt(id), { active: false });
    return { message: 'Webhook deactivated successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await this.webhooksService.delete(parseInt(id));
  }
}

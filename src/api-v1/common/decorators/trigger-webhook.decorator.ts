import { SetMetadata } from '@nestjs/common';
import { WebhookEvent } from '../../../webhooks/webhook.entity';

export const WEBHOOK_EVENT_KEY = 'webhook_event';

/**
 * Decorator para trigger automático de webhooks
 * @param event - Evento de webhook a disparar
 * @example
 * @TriggerWebhook(WebhookEvent.PRODUCT_CREATED)
 * async create(@Body() dto: CreateProductDto) { ... }
 */
export const TriggerWebhook = (event: WebhookEvent) =>
  SetMetadata(WEBHOOK_EVENT_KEY, event);

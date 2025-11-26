import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { Webhook, WebhookEvent } from './webhook.entity';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
    private readonly httpService: HttpService,
  ) {}

  async create(
    url: string,
    events: string[],
    secret?: string,
    description?: string,
  ): Promise<Webhook> {
    const webhook = this.webhookRepository.create({
      url,
      events,
      secret: secret || this.generateSecret(),
      description,
      active: true,
    });

    return await this.webhookRepository.save(webhook);
  }

  async findAll(): Promise<Webhook[]> {
    return await this.webhookRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Webhook | null> {
    return await this.webhookRepository.findOne({ where: { id } });
  }

  async update(id: number, updates: Partial<Webhook>): Promise<Webhook | null> {
    await this.webhookRepository.update(id, updates);
    return await this.webhookRepository.findOne({ where: { id } });
  }

  async delete(id: number): Promise<void> {
    await this.webhookRepository.delete(id);
  }

  async triggerWebhooks(event: WebhookEvent, payload: any): Promise<void> {
    const webhooks = await this.webhookRepository.find({
      where: { active: true },
    });

    const matchingWebhooks = webhooks.filter((wh) =>
      wh.events.includes(event),
    );

    if (matchingWebhooks.length === 0) {
      this.logger.debug(`No active webhooks found for event: ${event}`);
      return;
    }

    const deliveryPromises = matchingWebhooks.map((webhook) =>
      this.deliverWebhook(webhook, event, payload),
    );

    await Promise.allSettled(deliveryPromises);
  }

  private async deliverWebhook(
    webhook: Webhook,
    event: WebhookEvent,
    payload: any,
  ): Promise<void> {
    try {
      const webhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data: payload,
      };

      const signature = this.generateSignature(
        webhookPayload,
        webhook.secret || '',
      );

      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
        'X-Webhook-Signature': signature,
        'X-Webhook-ID': webhook.id.toString(),
      };

      const response = await firstValueFrom(
        this.httpService.post(webhook.url, webhookPayload, {
          headers,
          timeout: 10000,
        }),
      );

      webhook.deliveryCount++;
      webhook.lastDeliveryAt = new Date();
      await this.webhookRepository.save(webhook);

      this.logger.log(
        `Webhook delivered successfully: ${webhook.url} (${event})`,
      );
    } catch (error) {
      webhook.failureCount++;
      await this.webhookRepository.save(webhook);

      this.logger.error(
        `Webhook delivery failed: ${webhook.url} (${event})`,
        error.message,
      );

      if (webhook.failureCount >= 10) {
        webhook.active = false;
        await this.webhookRepository.save(webhook);
        this.logger.warn(
          `Webhook disabled due to repeated failures: ${webhook.url}`,
        );
      }
    }
  }

  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

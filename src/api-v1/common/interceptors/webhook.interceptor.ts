import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WebhooksService } from '../../../webhooks/webhooks.service';
import { WebhookEvent } from '../../../webhooks/webhook.entity';
import { WEBHOOK_EVENT_KEY } from '../decorators/trigger-webhook.decorator';

@Injectable()
export class WebhookInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WebhookInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly webhooksService: WebhooksService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const event = this.reflector.get<WebhookEvent>(
      WEBHOOK_EVENT_KEY,
      context.getHandler(),
    );

    if (!event) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((data) => {
        // Trigger webhook asíncronamente sin bloquear respuesta
        this.webhooksService
          .triggerWebhooks(event, data)
          .catch((err) => {
            this.logger.error(
              `Failed to trigger webhook for event ${event}:`,
              err.stack,
            );
          });
      }),
    );
  }
}

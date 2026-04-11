import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AdminAuditLogService } from './admin-audit-log.service';
import { AuditAction } from './admin-audit-log.entity';

const SENSITIVE_FIELDS = ['password', 'secret', 'token', 'key', 'hash'];

const RESOURCE_MAP: Record<string, string> = {
  products: 'product',
  categories: 'category',
  orders: 'order',
  users: 'user',
  discounts: 'discount',
  banners: 'banner',
  'api-keys': 'api-key',
  'exchange-rates': 'exchange-rate',
  invitations: 'invitation',
  customers: 'customer',
};

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AdminAuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method as string;

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = req.user;
    if (!user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => {
          try {
            const action = this.inferAction(method, req.path);
            const resource = this.inferResource(req.route?.path ?? req.path);
            const resourceId =
              req.params?.uuid ?? req.params?.id ?? null;
            const details = this.sanitizeBody(req.body);
            const ipAddress =
              (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
              req.ip ??
              null;

            this.auditLogService.log({
              userId: user.userId ?? null,
              userEmail: user.email ?? '',
              userFullName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
              action,
              resource,
              resourceId,
              details: Object.keys(details).length ? details : null,
              ipAddress,
            });
          } catch (err) {
            console.error('[AuditLogInterceptor] Error building log entry:', err);
          }
        },
      }),
    );
  }

  private inferAction(method: string, path: string): AuditAction {
    if (path.includes('/bulk/')) return AuditAction.BULK;
    if (path.includes('/revoke')) return AuditAction.UPDATE;
    switch (method) {
      case 'POST': return AuditAction.CREATE;
      case 'DELETE': return AuditAction.DELETE;
      default: return AuditAction.UPDATE;
    }
  }

  private inferResource(routePath: string): string {
    const segments = routePath.replace(/^\//, '').split('/');
    // Skip 'admin' prefix segment if present
    const start = segments[0] === 'admin' ? 1 : 0;
    const segment = segments[start] ?? 'unknown';
    return RESOURCE_MAP[segment] ?? segment;
  }

  private sanitizeBody(body: Record<string, any>): Record<string, any> {
    if (!body || typeof body !== 'object') return {};
    return Object.fromEntries(
      Object.entries(body).filter(
        ([key]) => !SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f)),
      ),
    );
  }
}

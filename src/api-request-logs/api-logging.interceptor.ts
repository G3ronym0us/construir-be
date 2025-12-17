import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiRequestLogsService } from './api-request-logs.service';

@Injectable()
export class ApiLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiLoggingInterceptor.name);

  constructor(
    private readonly apiRequestLogsService: ApiRequestLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // Extraer info del request
    const method = request.method;
    const path = request.url;
    const query = request.query;
    const requestBody = this.sanitizeBody(request.body);
    const requestHeaders = this.sanitizeHeaders(request.headers);
    const ipAddress = request.ip || request.connection?.remoteAddress;
    const userAgent = request.headers['user-agent'];
    const apiKey = request.apiKey; // Viene del ApiKeyGuard
    const consumerKey = apiKey?.consumerKey;

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          const responseTime = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;

          // Guardar log asíncronamente (no bloquear respuesta)
          this.saveLog({
            method,
            path,
            query,
            requestBody,
            requestHeaders,
            statusCode,
            responseBody: this.sanitizeBody(responseBody),
            responseTime,
            consumerKey,
            apiKey,
            ipAddress,
            userAgent,
            isError: false,
          });
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Guardar log de error
          this.saveLog({
            method,
            path,
            query,
            requestBody,
            requestHeaders,
            statusCode,
            responseBody: { error: error.message },
            responseTime,
            consumerKey,
            apiKey,
            ipAddress,
            userAgent,
            isError: true,
            errorMessage: error.message,
            errorStack: error.stack,
          });
        },
      }),
    );
  }

  private async saveLog(data: any): Promise<void> {
    try {
      await this.apiRequestLogsService.create(data);
    } catch (error) {
      // No lanzar error, solo loguear
      this.logger.error('Failed to save request log', error);
    }
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    if (typeof body !== 'object') return body;

    // Copiar objeto para no mutar
    const sanitized = Array.isArray(body) ? [...body] : { ...body };

    // Remover campos sensibles
    const sensitiveFields = [
      'password',
      'secret',
      'token',
      'apiKey',
      'consumerSecret',
      'currentPassword',
      'newPassword',
    ];

    if (!Array.isArray(sanitized)) {
      sensitiveFields.forEach((field) => {
        if (sanitized[field]) {
          sanitized[field] = '***REDACTED***';
        }
      });
    }

    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers) return null;

    const sanitized = { ...headers };

    // Remover headers sensibles
    delete sanitized['authorization'];
    delete sanitized['x-consumer-secret'];
    delete sanitized['cookie'];

    return sanitized;
  }
}

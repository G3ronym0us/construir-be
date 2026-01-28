import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import {
  buildPaginationLinks,
  buildLinkHeader,
  getBaseUrlFromRequest,
  getQueryParamsFromRequest,
} from '../utils/pagination-link.util';

interface PaginatedResponse {
  data: unknown[];
  total: number;
  page: number;
  perPage?: number;
  limit?: number;
  lastPage?: number;
  totalPages?: number;
}

/**
 * Interceptor that adds RFC 5988 Link header to paginated responses
 */
@Injectable()
export class PaginationLinkInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((response: unknown) => {
        if (this.isPaginatedResponse(response)) {
          const request = context.switchToHttp().getRequest<Request>();
          const res = context.switchToHttp().getResponse<Response>();

          const perPage = response.perPage ?? response.limit ?? 10;
          const lastPage =
            response.lastPage ??
            response.totalPages ??
            Math.ceil(response.total / perPage);

          if (lastPage > 0) {
            const baseUrl = getBaseUrlFromRequest(request);
            const queryParams = getQueryParamsFromRequest(request);

            const links = buildPaginationLinks({
              baseUrl,
              currentPage: response.page,
              lastPage,
              perPage,
              queryParams,
            });

            const linkHeader = buildLinkHeader(links);
            res.setHeader('Link', linkHeader);
          }
        }
        return response;
      }),
    );
  }

  private isPaginatedResponse(
    response: unknown,
  ): response is PaginatedResponse {
    if (!response || typeof response !== 'object') {
      return false;
    }

    const obj = response as Record<string, unknown>;
    return (
      Array.isArray(obj.data) &&
      typeof obj.total === 'number' &&
      typeof obj.page === 'number'
    );
  }
}

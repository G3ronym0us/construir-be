import { Request } from 'express';

export interface PaginationLinkParams {
  baseUrl: string;
  currentPage: number;
  lastPage: number;
  perPage: number;
  queryParams?: Record<string, string>;
}

export interface PaginationLinks {
  first: string;
  prev: string | null;
  next: string | null;
  last: string;
}

/**
 * Builds pagination links for a paginated response
 */
export function buildPaginationLinks(
  params: PaginationLinkParams,
): PaginationLinks {
  const { baseUrl, currentPage, lastPage, perPage, queryParams = {} } = params;

  const buildUrl = (page: number): string => {
    const url = new URL(baseUrl);
    url.searchParams.set('page', String(page));
    url.searchParams.set('perPage', String(perPage));

    // Add other query params (like search)
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key !== 'page' && key !== 'perPage' && value) {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  };

  return {
    first: buildUrl(1),
    prev: currentPage > 1 ? buildUrl(currentPage - 1) : null,
    next: currentPage < lastPage ? buildUrl(currentPage + 1) : null,
    last: buildUrl(lastPage),
  };
}

/**
 * Builds the Link header string according to RFC 5988
 */
export function buildLinkHeader(links: PaginationLinks): string {
  const parts: string[] = [];

  parts.push(`<${links.first}>; rel="first"`);

  if (links.prev) {
    parts.push(`<${links.prev}>; rel="prev"`);
  }

  if (links.next) {
    parts.push(`<${links.next}>; rel="next"`);
  }

  parts.push(`<${links.last}>; rel="last"`);

  return parts.join(', ');
}

/**
 * Extracts the base URL from an Express request
 */
export function getBaseUrlFromRequest(request: Request): string {
  const protocol = request.protocol;
  const host = request.get('host');
  const path = request.baseUrl + request.path;

  return `${protocol}://${host}${path}`;
}

/**
 * Extracts query parameters from request, excluding pagination params
 */
export function getQueryParamsFromRequest(
  request: Request,
): Record<string, string> {
  const params: Record<string, string> = {};

  Object.entries(request.query).forEach(([key, value]) => {
    if (typeof value === 'string') {
      params[key] = value;
    }
  });

  return params;
}

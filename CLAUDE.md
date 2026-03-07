# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS backend for a Venezuelan hardware/construction supply store (Construir). Handles product catalog, orders, customers, and exposes both an internal admin API and an external REST API (v1).

## Key Commands

```bash
yarn start:dev           # Development mode with auto-reload
yarn build               # Compile to dist/
yarn test                # Run all unit tests
yarn test -- --testPathPattern=products  # Run a single test file
yarn lint                # ESLint with auto-fix
```

### Database Migrations (TypeORM)
```bash
yarn migration:generate -- src/database/migrations/MigrationName  # Generate from entity diff
yarn migration:create -- src/database/migrations/MigrationName    # Create blank migration
yarn migration:run       # Apply pending migrations
yarn migration:revert    # Rollback last migration
yarn migration:show      # List migration status
```

`synchronize: false` is enforced — always use explicit migrations. The data source config is at `src/database/data-source.ts`.

### Utility Scripts
```bash
yarn update-image-urls        # Migrate WordPress image URLs to local
yarn init-exchange-rate       # Seed initial USD/VES exchange rate
yarn export-postman           # Generate Postman collection from Swagger
yarn check-missing-images     # Find products with missing image files
yarn migrate-images-s3        # Upload local images to S3
yarn reset-admin-password     # Reset admin user password
```

## Architecture

### Dual API Surface

The app exposes two distinct API surfaces:

1. **Internal admin API** (`src/auth/`, `src/users/`, `src/products/`, etc.) — JWT-authenticated, used by the admin frontend. Routes use `@UseGuards(JwtAuthGuard)`.

2. **External public API v1** (`src/api-v1/`) — API-key authenticated, documented with Swagger at `/api-docs`. Uses `ApiKeyGuard` with permission levels (`READ`, `WRITE`, `READ_WRITE`). Interceptors automatically fire webhooks (`WebhookInterceptor`) and inject pagination `Link` headers (`PaginationLinkInterceptor`).

### Feature Modules

| Module | Purpose |
|--------|---------|
| `auth` | JWT auth, login, JwtStrategy |
| `users` | Admin users with roles (ADMIN, ORDER_ADMIN) |
| `products` | Product catalog with images, SKU/UUID lookup, S3 upload |
| `categories` | Hierarchical categories with `externalCode` for v1 API mapping |
| `orders` | Orders with items, shipping, payment info, status tracking |
| `customers` | Registered customers (separate from guest orders) |
| `exchange-rates` | USD/VES rate via BCV scraping, scheduled auto-update |
| `discounts` | Discount codes |
| `banners` | Homepage banners |
| `banks` | Venezuelan bank accounts for payment info |
| `api-keys` | API key management with permission levels |
| `webhooks` | Webhook subscriptions, fired by `@TriggerWebhook()` decorator |
| `api-request-logs` | Logs all v1 API requests via `ApiLoggingInterceptor` |
| `analytics` | Order/sales analytics |
| `cart` | Shopping cart |
| `email` | Transactional emails via Handlebars templates + nodemailer |

### Exchange Rate System

`BCVService` scrapes the BCV (Banco Central de Venezuela) for the official USD/VES rate. `ExchangeRateTasksService` runs a scheduled job to keep it updated. Products store prices in USD; the API returns calculated VES prices.

### Webhook System

Use `@TriggerWebhook(WebhookEvent.PRODUCT_CREATED)` on v1 controller methods. The `WebhookInterceptor` catches the response and fires registered webhook URLs asynchronously.

### Configuration

All config in `src/config/configuration.ts` via `@nestjs/config`. Required env vars:

```
DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
JWT_SECRET, JWT_EXPIRES_IN
AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME
APP_URL, STORE_NAME, STORE_ADDRESS, STORE_CITY, STORE_PHONE, STORE_HOURS, STORE_MAP_URL
EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM
```

## Static Files - Product Images

Images are served from `public/uploads/` (excluded from git, ~860MB).

- Old WordPress URL: `http://54.236.97.190/wp-content/uploads/YYYY/MM/image.jpg`
- Local URL: `http://localhost:3000/uploads/YYYY/MM/image.jpg`
- Use `API_URL=http://your-domain.com yarn update-image-urls` to migrate URLs in DB

New image uploads go to S3 via `S3Service`. The `public/` directory is provisional — future images should use S3 only.

## Swagger / API Docs

Available at `/api-docs` in development. Config at `src/api-v1/common/swagger/swagger-config.ts`. Custom decorator helpers for common Swagger patterns are in `src/api-v1/common/decorators/api-documentation.decorator.ts`.

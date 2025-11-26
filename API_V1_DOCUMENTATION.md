# API v1 Documentation

## Overview

API v1 is the current version of the Construir API. It provides access to products, orders, and customers using native entity format. This API returns data as TypeORM entities without any transformation, making it straightforward to work with.

## Key Features

- **Native Entity Format**: Returns TypeORM entities directly without transformation
- **UUID-based Endpoints**: All resources use UUIDs for identification
- **API Key Authentication**: Secure access using API keys with granular permissions
- **Webhook Support**: Automatic webhook triggering for key events
- **Direct Service Integration**: Controllers delegate to base services (ProductsService, OrdersService, CustomersService)

## API Design Principles

- **Native Entity Format**: Returns TypeORM entities directly without transformation
- **No Service Duplication**: Controllers delegate to base services (ProductsService, OrdersService, CustomersService)
- **Consistent Naming**: Uses camelCase following TypeScript conventions
- **UUID-based**: All resources identified by UUIDs for security and scalability

## Authentication

All API v1 endpoints require authentication using API keys.

### API Key Header

```http
Authorization: Bearer <client_id>:<client_secret>
```

### Permissions

- `READ`: Access to GET endpoints
- `WRITE`: Access to POST, PUT, DELETE endpoints
- `READ_WRITE`: Full access to all endpoints

### Example Request

```bash
curl -H "Authorization: Bearer your_client_id:your_client_secret" \
     https://api.example.com/api/v1/products
```

## Base URL

```
/api/v1
```

## Endpoints

### Products

#### GET /api/v1/products

List all products with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `perPage` (optional): Items per page (default: 10)
- `search` (optional): Search term for name, SKU, or description

**Response:**
```json
{
  "data": [
    {
      "uuid": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Product Name",
      "sku": "PROD-001",
      "price": "99.99",
      "inventory": 50,
      "published": true,
      "description": "Product description",
      "shortDescription": "Short description",
      "barcode": null,
      "type": "simple",
      "visibility": "visible",
      "featured": false,
      "categories": [...],
      "images": [...],
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "deletedAt": null
    }
  ],
  "total": 100,
  "page": 1,
  "lastPage": 10
}
```

#### GET /api/v1/products/:uuid

Get a single product by UUID.

**Parameters:**
- `uuid`: Product UUID

**Response:**
```json
{
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Product Name",
  "sku": "PROD-001",
  "price": "99.99",
  "inventory": 50,
  "published": true,
  "categories": [...],
  "images": [...]
}
```

#### POST /api/v1/products

Create a new product.

**Requires:** `WRITE` permission

**Request Body:**
```json
{
  "name": "New Product",
  "price": 99.99,
  "sku": "PROD-002",
  "inventory": 25,
  "published": true,
  "description": "Product description",
  "shortDescription": "Short desc"
}
```

**Webhook:** Triggers `PRODUCT_CREATED` event

#### PUT /api/v1/products/:uuid

Update a product.

**Requires:** `WRITE` permission

**Parameters:**
- `uuid`: Product UUID

**Request Body:** Partial product data

**Webhook:** Triggers `PRODUCT_UPDATED` event

#### DELETE /api/v1/products/:uuid

Delete a product (soft delete).

**Requires:** `WRITE` permission

**Parameters:**
- `uuid`: Product UUID

**Webhook:** Triggers `PRODUCT_DELETED` event

---

### Orders

#### GET /api/v1/orders

List all orders with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `perPage` (optional): Items per page (default: 20)
- `status` (optional): Filter by order status

**Response:**
```json
{
  "data": [
    {
      "uuid": "123e4567-e89b-12d3-a456-426614174001",
      "orderNumber": "ORD-001",
      "status": "pending",
      "total": "299.99",
      "customer": {...},
      "items": [...],
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "lastPage": 3
}
```

#### GET /api/v1/orders/:uuid

Get a single order by UUID.

#### PUT /api/v1/orders/:uuid

Update an order.

**Requires:** `WRITE` permission

**Webhook:** Triggers `ORDER_UPDATED` event

---

### Customers

#### GET /api/v1/customers

List all customers with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `perPage` (optional): Items per page (default: 20)
- `search` (optional): Search by email or name

**Response:**
```json
{
  "data": [
    {
      "uuid": "123e4567-e89b-12d3-a456-426614174002",
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 30,
  "page": 1,
  "lastPage": 2
}
```

#### GET /api/v1/customers/:id

Get a single customer.

**Note:** Update and Delete operations return `501 Not Implemented` as they are not yet supported.

---

## Webhooks

API v1 automatically triggers webhooks for the following events:

- `PRODUCT_CREATED`: When a new product is created
- `PRODUCT_UPDATED`: When a product is updated
- `PRODUCT_DELETED`: When a product is deleted
- `ORDER_UPDATED`: When an order status is updated
- `CUSTOMER_UPDATED`: When customer data is updated
- `CUSTOMER_DELETED`: When a customer is deleted

Webhooks are triggered asynchronously and do not block API responses.

## Error Responses

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Product with UUID <uuid> not found"
}
```

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["name should not be empty", "price must be a number"],
  "error": "Bad Request"
}
```

## Response Format

All API responses return native TypeORM entities in camelCase format.

### Example Product Response
```json
{
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Product",
  "inventory": 50,
  "price": "99.99",
  "sku": "PROD-001",
  "published": true,
  "categories": [...],
  "images": [...]
}
```

## Rate Limiting

Currently, there is no rate limiting on API v1 endpoints. This may be added in future versions.

## Versioning

The API uses URL-based versioning (`/api/v1`). Breaking changes will result in a new API version.

## Support

For issues or questions about API v1, please contact the development team.

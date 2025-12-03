import { DocumentBuilder } from '@nestjs/swagger';

export const internalApiConfig = new DocumentBuilder()
  .setTitle('Construir Internal API')
  .setDescription(
    `
    API interna para la aplicación web y móvil de Construir

    ## Autenticación

    Esta API utiliza JSON Web Tokens (JWT) para autenticación.

    **Formato del token:**
    \`\`\`
    Authorization: Bearer {jwt_token}
    \`\`\`

    **Obtener token:**
    1. Registrarse en \`POST /users/register\`
    2. Iniciar sesión en \`POST /auth/login\`
    3. Usar el token recibido en el header Authorization

    ## Roles de Usuario

    - **USER**: Usuario registrado con acceso a funcionalidades básicas (carrito, órdenes propias)
    - **ADMIN**: Administrador con acceso completo a gestión y reportes

    ## Endpoints Públicos

    Algunos endpoints no requieren autenticación:
    - Listado y búsqueda de productos
    - Consulta de categorías
    - Tracking de órdenes (por número de orden)
    - Validación de códigos de descuento
    - Consulta de bancos y tasas de cambio

    ## Guest Checkout

    Los usuarios pueden crear órdenes sin estar autenticados usando el endpoint \`POST /orders\`
    con el guard \`OptionalJwtAuthGuard\`.
  `,
  )
  .setVersion('1.0')
  .addServer('http://localhost:3000', 'Desarrollo Local')
  .addServer('https://api.construir.com', 'Producción')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Ingresa tu JWT token obtenido del endpoint /auth/login',
    },
    'bearer',
  )
  .addTag('Authentication', 'Login y gestión de sesión')
  .addTag('Users', 'Registro y gestión de usuarios')
  .addTag('Products', 'Catálogo de productos')
  .addTag('Categories', 'Categorías de productos')
  .addTag('Shopping Cart', 'Carrito de compras (requiere autenticación)')
  .addTag('Orders', 'Gestión de órdenes y checkout')
  .addTag('Discounts & Promotions', 'Códigos de descuento y promociones')
  .addTag('Marketing', 'Banners y contenido promocional')
  .addTag('Customers (Admin)', 'Analytics y gestión de clientes (solo admin)')
  .addTag(
    'Admin - API Keys',
    'Gestión de API keys para integraciones (solo admin)',
  )
  .addTag('Admin - Webhooks', 'Configuración de webhooks (solo admin)')
  .addTag('Reference Data', 'Datos de referencia (bancos, etc.)')
  .addTag('Currency', 'Tasas de cambio')
  .addTag('Analytics', 'Tracking y estadísticas')
  .build();

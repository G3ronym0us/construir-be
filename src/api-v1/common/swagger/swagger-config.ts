import { DocumentBuilder } from '@nestjs/swagger';

export const v1SwaggerConfig = new DocumentBuilder()
  .setTitle('Construir API V1 - External')
  .setDescription(
    `
    RESTful API externa para integraciones de terceros con la plataforma e-commerce Construir

    ## Autenticación

    Esta API requiere autenticación mediante API keys. Se soportan tres métodos:

    **1. Bearer Token (Recomendado)**
    \`\`\`
    Authorization: Bearer {consumer_key}:{consumer_secret}
    \`\`\`

    **2. Query Parameters**
    \`\`\`
    ?consumer_key={key}&consumer_secret={secret}
    \`\`\`

    **3. Custom Headers**
    \`\`\`
    x-consumer-key: {key}
    x-consumer-secret: {secret}
    \`\`\`

    ## Permisos

    Las API keys tienen uno de tres niveles de permisos:
    - **READ**: Puede ver recursos (endpoints GET)
    - **WRITE**: Puede crear, actualizar y eliminar recursos (endpoints POST, PUT, DELETE)
    - **READ_WRITE**: Acceso completo a todos los endpoints

    ## Formato de Respuesta

    Todas las respuestas usan formato de entidad nativo con relaciones completas.
    Los endpoints paginados retornan:
    \`\`\`json
    {
      "data": [...],
      "total": 100,
      "page": 1,
      "perPage": 10
    }
    \`\`\`
  `,
  )
  .setVersion('1.0')
  .addServer(process.env.API_URL || 'http://localhost:3000', 'Servidor Principal')
  .addServer('http://localhost:3000', 'Desarrollo Local')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'key:secret',
      description: 'Formato: Bearer {consumer_key}:{consumer_secret}',
    },
    'bearerAuth',
  )
  .addApiKey(
    {
      type: 'apiKey',
      name: 'consumer_key',
      in: 'query',
      description:
        'Consumer key (se usa junto con el parámetro consumer_secret)',
    },
    'queryAuth',
  )
  .addApiKey(
    {
      type: 'apiKey',
      name: 'x-consumer-key',
      in: 'header',
      description:
        'Consumer key (se usa junto con el header x-consumer-secret)',
    },
    'headerAuth',
  )
  .addTag('Products V1', 'Gestión de catálogo de productos')
  .addTag('Orders V1', 'Gestión y seguimiento de órdenes')
  .addTag('Customers V1', 'Información y estadísticas de clientes')
  .build();

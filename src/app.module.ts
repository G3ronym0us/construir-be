import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { BannersModule } from './banners/banners.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { DiscountsModule } from './discounts/discounts.module';
import { BanksModule } from './banks/banks.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CustomersModule } from './customers/customers.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ApiV1Module } from './api-v1/api-v1.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ApiRequestLogsModule } from './api-request-logs/api-request-logs.module';
import { AdminAuditLogsModule } from './admin-audit-logs/admin-audit-logs.module';
import { AuditLogInterceptor } from './admin-audit-logs/audit-log.interceptor';
import { VisitanteThrottlerGuard } from './common/throttling/visitante-throttler.guard';
import {
  databaseConfig,
  jwtConfig,
  awsConfig,
  appConfig,
  emailConfig,
  bcvRatesConfig,
  analyticsConfig,
  ordersConfig,
} from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        jwtConfig,
        awsConfig,
        appConfig,
        emailConfig,
        bcvRatesConfig,
        analyticsConfig,
        ordersConfig,
      ],
    }),
    ScheduleModule.forRoot(),
    // Techo por defecto para TODA la aplicación. El guard va registrado abajo
    // como `APP_GUARD`; antes esta configuración existía pero no la aplicaba
    // nadie, así que los 60 de acá no limitaban ninguna ruta que no los pidiera
    // a mano. Medido antes del cambio: 70 `POST /orders` seguidos devolvían 70
    // pedidos creados, 142 correos enviados y 71 unidades menos de inventario,
    // sin un solo 429.
    //
    // **De dónde salen los 600.** El número tiene que dejar pasar una sesión de
    // compra real, así que se midió con un navegador de verdad contra la
    // tienda, no a ojo:
    //
    // - Una compra completa (portada → catálogo → búsqueda → tres fichas de
    //   producto → carrito → checkout) cuesta **50 peticiones al backend**.
    // - Cada cambio de ruta cuesta **6 peticiones**, no una: la página pide la
    //   tasa de cambio, los datos de la tienda y el perfil, registra la visita
    //   y encima pide sus propios datos. Medido dos veces por separado
    //   (50 ÷ 8 navegaciones, y 114 ÷ 19 navegaciones): 6 las dos veces.
    // - El peor caso legítimo ya estaba medido en este proyecto: el controlador
    //   de analítica documenta **63 cambios de ruta por minuto** para alguien
    //   que le da a atrás y adelante entre productos. A 6 peticiones cada uno
    //   son **378 peticiones por minuto de un cliente que sólo está mirando**.
    //
    // 600 deja un 59% de aire por encima de esos 378: cubre que una página
    // engorde a 7 u 8 peticiones, que el cliente abra una segunda pestaña, o
    // que dos personas compartan la salida a internet. Y sigue siendo un techo:
    // 600 por minuto son 10 peticiones por segundo sostenidas durante un minuto
    // entero, y eso ya no es una persona navegando.
    //
    // Se eligió holgado a propósito. Un límite global demasiado justo no falla
    // como un error: falla como una tienda que no vende, y el cliente al que
    // eche no lo va a reportar. Lo que de verdad frena el abuso son los límites
    // por ruta de `orders` y `auth`, mucho más estrictos, porque están puestos
    // sobre lo que cuesta caro: crear un pedido, mandar un correo, descontar
    // inventario. Éste es sólo la red de abajo.
    //
    // Ojo con el almacén: es el de memoria. Con más de una instancia de la
    // aplicación el techo efectivo se multiplica por el número de instancias
    // (ya anotado en `docs/despliegue-analitica.md` §4).
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 600 }]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: true,
        synchronize: false,
      }),
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    BannersModule,
    CartModule,
    OrdersModule,
    DiscountsModule,
    BanksModule,
    ExchangeRatesModule,
    AnalyticsModule,
    CustomersModule,
    ApiKeysModule,
    ApiV1Module,
    WebhooksModule,
    ApiRequestLogsModule,
    AdminAuditLogsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // El límite de tasa se aplica a TODA la aplicación desde acá. Antes sólo
    // corría donde alguien se acordara de escribir `@UseGuards(ThrottlerGuard)`
    // —dos rutas de todo el proyecto—, y `POST /orders`, que crea pedidos,
    // manda correos a una dirección que elige quien llama y descuenta
    // inventario sin pedir sesión, no era una de ellas.
    //
    // Va `VisitanteThrottlerGuard` y no el guard de serie porque el de serie
    // cuenta por `req.ip`, que detrás del proxy es la IP del proxy: un límite
    // global con ese criterio contaría a la tienda entera como un solo cliente
    // y el primer visitante del minuto se llevaría el cupo de todos. El porqué
    // completo está en el guard.
    { provide: APP_GUARD, useClass: VisitanteThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}

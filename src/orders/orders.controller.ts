import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import {
  detectReceiptFileType,
  MAX_RECEIPT_BYTES,
} from './receipt-file';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { OrderAdminGuard } from '../auth/guards/order-admin.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QuoteOrderDto } from './dto/quote-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus } from './order.entity';
import { PaymentStatus } from './payment-info.entity';
import { S3Service } from '../products/s3.service';
import { UserRole } from '../users/user.entity';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Crear una nueva orden (con o sin autenticación)
   * Si el usuario está autenticado, usa su carrito del backend
   * Si no está autenticado (guest), crea orden con email del shippingAddress
   *
   * La respuesta NO devuelve la ficha del invitado. Esta ruta no exige sesión y
   * la ficha viajaba entera por la relación eager: identificadores internos,
   * fechas y —lo que de verdad importaba— la nota del domicilio y las
   * coordenadas GPS guardadas. Era un canal de fuga por sí solo: bastaba pedir
   * con una cédula ajena para que la respuesta del propio POST devolviera el
   * domicilio de esa persona, sin necesidad siquiera de consultar el buscador
   * después.
   *
   * No se pierde nada con quitarla: quien acaba de hacer el pedido conoce sus
   * datos, los acaba de escribir, y el checkout sólo usa el `uuid` de la
   * respuesta para subir el comprobante y redirigir.
   */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  // 5 pedidos por minuto y por cliente. Ésta es la ruta cara de todo el
  // proyecto y hasta ahora no tenía ningún límite: sin sesión, sin coste y sin
  // techo, cada llamada **crea un pedido, descuenta inventario real y dispara
  // dos correos** —uno al cliente y otro al administrador—, y la dirección del
  // primero la elige quien llama. Medido antes de este límite: 70 llamadas
  // seguidas dieron 70 pedidos, 71 unidades menos de inventario y 142 correos
  // salidos con el dominio de la tienda.
  //
  // 5 no estorba a nadie: un cliente hace UN pedido por compra. El margen es
  // para el que reintenta —se equivocó en la referencia del pago, se le fue la
  // conexión al confirmar, le rebotó por la tasa (409) y vuelve a probar—, y
  // cinco intentos en el mismo minuto ya cubre de sobra ese día malo.
  //
  // Y no se puede subir "por si acaso": el número ES el techo del bombardeo de
  // correo (5 pedidos = 10 correos por minuto y por origen) y el de la
  // sangría de inventario. Cada unidad que se sube multiplica las dos cosas.
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async createOrder(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user?.userId || null;
    const orden = await this.ordersService.createOrder(createOrderDto, userId);

    const { guestCustomer: _fichaDelInvitado, ...sinLaFicha } = orden;
    void _fichaDelInvitado;
    return sinLaFicha;
  }

  /**
   * Previsualizar el desglose de un pedido sin crearlo.
   *
   * El checkout lo usa para mostrar base + IVA = total. No requiere
   * autenticación, igual que la creación de órdenes, porque el checkout
   * funciona para invitados. Cuando SÍ hay usuario autenticado, se pasa su
   * `userId` para que el servicio cotice el mismo carrito que `createOrder`
   * va a facturar — antes se descartaba y el quote sólo miraba el body.
   *
   * `@HttpCode(OK)`: es una previsualización sin efectos secundarios, no una
   * creación; el 201 por defecto de `@Post` no correspondía.
   */
  @Post('quote')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  // 30 por minuto. El checkout recotiza en cada cambio del formulario —método
  // de entrega, cantidad, cupón—, así que el límite tiene que aguantar a
  // alguien toqueteando la pantalla; 30 es más de lo que da la mano en un
  // minuto y muy poco para un bucle.
  //
  // Lo que se está acotando acá es la ENUMERACIÓN DE CUPONES: esta ruta acepta
  // un `discountCode` y responde distinto según exista o no. El mensaje ya se
  // unificó en `DiscountsService.validateDiscount`, así que la respuesta ya no
  // dice cuál de los dos es; el límite es la segunda mitad, la que impide
  // probar el diccionario entero. Es el mismo par de medidas que se aplicó al
  // buscador de invitados, en el endpoint de al lado.
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async quoteOrder(@Request() req, @Body() quoteOrderDto: QuoteOrderDto) {
    const userId = req.user?.userId || null;
    return this.ordersService.quoteOrder(quoteOrderDto, userId);
  }

  /**
   * Subir el comprobante de pago de una orden.
   *
   * Sigue sin pedir sesión y tiene que seguir así: el checkout de invitado es
   * el caso normal, y quien paga sin cuenta no tiene con qué autenticarse. Pero
   * antes eso era barra libre — cualquiera que acertara un uuid escribía en el
   * bucket de producción sin límite de tasa, sin límite de tamaño y con el tipo
   * de archivo validado por el `Content-Type` que él mismo mandaba. Lo que
   * ahora lo acota:
   *
   * - 5 subidas por minuto y por cliente. Ojo: el "y por cliente" es nuevo. El
   *   `@UseGuards(ThrottlerGuard)` que había acá usaba el guard de serie, que
   *   cuenta por `req.ip`, y sin `trust proxy` eso es la IP del proxy para todo
   *   el mundo: las 5 subidas por minuto se las repartía la tienda entera, y el
   *   sexto cliente del minuto no podía pagar. Ahora el guard es el global
   *   (`VisitanteThrottlerGuard`, en `app.module.ts`), que identifica al
   *   visitante de verdad, y acá sólo queda el `@Throttle` que baja el techo;
   * - la orden tiene que existir, no estar cancelada y no tener el pago ya
   *   verificado (`assertReceiptUploadAllowed`), y eso se comprueba ANTES de
   *   escribir en S3, para no dejar basura en el bucket de un intento inválido;
   * - 5 MB de tope en multer, que antes no había ninguno;
   * - el tipo sale de los bytes del fichero, no de lo que diga el cliente, y la
   *   extensión de la clave sale de ahí y no de `originalname` — con el que se
   *   podía dejar un `.html` servido desde el dominio del bucket.
   *
   * El comprobante va por `uploadPrivateFile`, así que no queda ninguna URL
   * pública ni en S3 ni en la respuesta.
   */
  @Post(':uuid/receipt')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @UseInterceptors(
    FileInterceptor('receipt', {
      limits: { fileSize: MAX_RECEIPT_BYTES, files: 1 },
    }),
  )
  async uploadReceipt(
    @Param('uuid') uuid: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Receipt file is required');
    }

    const fileType = detectReceiptFileType(file.buffer);
    if (!fileType) {
      throw new BadRequestException(
        'El comprobante debe ser una imagen JPEG, PNG o WebP, o un PDF',
      );
    }

    await this.ordersService.assertReceiptUploadAllowed(uuid);

    const { key } = await this.s3Service.uploadPrivateFile(
      file,
      'receipts',
      `receipts/${randomUUID()}.${fileType.extension}`,
      fileType.mimeType,
    );

    const { order, previousKey } = await this.ordersService.uploadPaymentReceipt(
      uuid,
      key,
    );

    // Al reemplazar un comprobante rechazado, el anterior no tiene por qué
    // quedarse en el bucket: son datos personales que ya no hacen falta.
    if (previousKey && previousKey !== key) {
      await this.s3Service.deleteFile(previousKey).catch(() => undefined);
    }

    return order;
  }

  /**
   * Enlace temporal para ver o descargar el comprobante de una orden.
   *
   * Reemplaza a la URL pública del bucket que antes viajaba dentro de la orden.
   * Quién puede pedirlo lo decide `getReceiptKeyForViewer`: admin, order_admin
   * o el cliente registrado dueño de la orden.
   */
  @Get(':uuid/receipt')
  @UseGuards(JwtAuthGuard)
  async getReceipt(
    @Request() req,
    @Param('uuid') uuid: string,
    @Query('download') download?: string,
  ) {
    const isAdmin =
      req.user?.role === UserRole.ADMIN ||
      req.user?.role === UserRole.ORDER_ADMIN;

    const { order, receiptKey } =
      await this.ordersService.getReceiptKeyForViewer(uuid, {
        userId: req.user?.userId,
        isAdmin,
      });

    const wantsDownload = download === '1' || download === 'true';
    const extension = receiptKey.split('.').pop() ?? 'jpg';

    const { url, expiresIn } = await this.s3Service.getSignedDownloadUrl(
      receiptKey,
      {
        disposition: wantsDownload ? 'attachment' : 'inline',
        filename: wantsDownload
          ? `comprobante-${order.orderNumber}.${extension}`
          : undefined,
      },
    );

    return { url, expiresIn };
  }

  /**
   * Obtener todas las órdenes del usuario autenticado
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getMyOrders(@Request() req) {
    const userId = req.user.userId;
    const isAdmin =
      req.user.role === UserRole.ADMIN ||
      req.user.role === UserRole.ORDER_ADMIN;
    return this.ordersService.findAll(userId, isAdmin);
  }

  /**
   * Obtener una orden específica
   */
  @Get(':uuid')
  @UseGuards(JwtAuthGuard)
  async getOrder(@Request() req, @Param('uuid') uuid: string) {
    const userId = req.user?.userId;
    const isAdmin =
      req.user?.role === UserRole.ADMIN ||
      req.user?.role === UserRole.ORDER_ADMIN;

    // Si es admin, no validar userId
    return this.ordersService.findOneByUuid(uuid, isAdmin ? undefined : userId);
  }

  /**
   * Seguimiento público de un pedido, con sólo el número de orden.
   *
   * Devuelve un `OrderTrackingDto`, no la entidad `Order`: acá no hay sesión
   * que diga quién pregunta, así que la respuesta se limita al avance del
   * pedido. Devolver la entidad entregaba, además, la cédula y el domicilio
   * del cliente, los datos del pago con el enlace al comprobante, las notas
   * internas y la referencia del ERP.
   */
  @Get('track/:orderNumber')
  async trackOrder(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.trackByOrderNumber(orderNumber);
  }

  /**
   * Actualizar estado de la orden (solo admin)
   */
  @Patch(':uuid/status')
  @UseGuards(JwtAuthGuard, OrderAdminGuard)
  async updateOrderStatus(
    @Param('uuid') uuid: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(uuid, updateOrderStatusDto);
  }

  /**
   * Cancelar una orden
   */
  @Delete(':uuid')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(@Request() req, @Param('uuid') uuid: string) {
    const userId = req.user.userId;
    const isAdmin =
      req.user.role === UserRole.ADMIN ||
      req.user.role === UserRole.ORDER_ADMIN;

    return this.ordersService.cancelOrder(uuid, isAdmin ? undefined : userId);
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Dashboard de estadísticas (solo admin)
   */
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, OrderAdminGuard)
  async getAdminStats() {
    return this.ordersService.getAdminStats();
  }

  /**
   * Filtrar órdenes con opciones avanzadas (solo admin)
   */
  @Get('admin/filter')
  @UseGuards(JwtAuthGuard, OrderAdminGuard)
  async filterOrders(
    @Query('status') status?: OrderStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.ordersService.getAdminOrders({
      status,
      paymentStatus,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: toEndOfDay(endDate),
      search,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  /**
   * Exportar órdenes a CSV (solo admin)
   */
  @Get('admin/export/csv')
  @UseGuards(JwtAuthGuard, OrderAdminGuard)
  async exportOrders(
    @Res() res: Response,
    @Query('status') status?: OrderStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.ordersService.exportToCSV({
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: toEndOfDay(endDate),
    });

    const filename = `orders_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}

/**
 * Cierra el rango en el último instante del día indicado.
 *
 * El panel manda `endDate` como fecha suelta ("2026-07-28") y `new Date()` la
 * lee como medianoche, así que sin esto el filtro dejaba fuera todas las
 * órdenes del propio día que el admin escogió como fin del rango. Una fecha con
 * hora explícita se respeta tal cual.
 */
function toEndOfDay(value?: string): Date | undefined {
  if (!value) return undefined;

  const date = new Date(value);
  if (isNaN(date.getTime())) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    date.setUTCHours(23, 59, 59, 999);
  }

  return date;
}

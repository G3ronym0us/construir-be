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
import { Response } from 'express';
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
   */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async createOrder(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user?.userId || null;
    return this.ordersService.createOrder(createOrderDto, userId);
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
  async quoteOrder(@Request() req, @Body() quoteOrderDto: QuoteOrderDto) {
    const userId = req.user?.userId || null;
    return this.ordersService.quoteOrder(quoteOrderDto, userId);
  }

  /**
   * Subir comprobante de pago
   */
  @Post(':uuid/receipt')
  @UseInterceptors(FileInterceptor('receipt'))
  async uploadReceipt(
    @Param('uuid') uuid: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Receipt file is required');
    }

    // Validar tipo de archivo
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only image files (JPEG, PNG, WebP) and PDF are allowed',
      );
    }

    // Subir a S3
    const folder = 'receipts';
    const result = await this.s3Service.uploadFile(file, folder);

    // Actualizar la orden con el comprobante
    return this.ordersService.uploadPaymentReceipt(
      uuid,
      result.url,
      result.key,
    );
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

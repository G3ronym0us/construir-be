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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
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
    const isAdmin = req.user.role === 'admin';
    return this.ordersService.findAll(userId, isAdmin);
  }

  /**
   * Obtener una orden específica
   */
  @Get(':uuid')
  @UseGuards(JwtAuthGuard)
  async getOrder(@Request() req, @Param('uuid') uuid: string) {
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    // Si es admin, no validar userId
    return this.ordersService.findOneByUuid(uuid, isAdmin ? undefined : userId);
  }

  /**
   * Obtener orden por número de orden (público con el número)
   */
  @Get('track/:orderNumber')
  async trackOrder(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.findByOrderNumber(orderNumber);
  }

  /**
   * Actualizar estado de la orden (solo admin)
   */
  @Patch(':uuid/status')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
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
    const isAdmin = req.user.role === 'admin';

    return this.ordersService.cancelOrder(uuid, isAdmin ? undefined : userId);
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Dashboard de estadísticas (solo admin)
   */
  @Get('admin/stats')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAdminStats() {
    return this.ordersService.getAdminStats();
  }

  /**
   * Filtrar órdenes con opciones avanzadas (solo admin)
   */
  @Get('admin/filter')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async filterOrders(
    @Query('status') status?: OrderStatus,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.ordersService.filterOrders({
      status,
      paymentStatus,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  /**
   * Exportar órdenes a CSV (solo admin)
   */
  @Get('admin/export/csv')
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async exportOrders(
    @Res() res: Response,
    @Query('status') status?: OrderStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.ordersService.exportToCSV({
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    const filename = `orders_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}

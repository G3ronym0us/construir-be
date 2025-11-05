import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus, DeliveryMethod } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import { PaymentInfo, PaymentStatus } from './payment-info.entity';
import { Cart } from '../cart/cart.entity';
import { Product } from '../products/product.entity';
import { User, UserRole } from '../users/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(ShippingAddress)
    private readonly shippingAddressRepository: Repository<ShippingAddress>,
    @InjectRepository(PaymentInfo)
    private readonly paymentInfoRepository: Repository<PaymentInfo>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Genera un número de orden único
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Crea una nueva orden desde el carrito del usuario (backend) o items guest
   */
  async createOrder(
    createOrderDto: CreateOrderDto,
    userId?: number | null,
  ): Promise<Order> {
    // 1. Determinar el origen de los items
    let orderItems: Array<{ productId: number; quantity: number }> = [];

    if (userId) {
      // Usuario autenticado: obtener items del carrito backend
      const cart = await this.cartRepository.findOne({
        where: { userId },
        relations: ['items', 'items.product'],
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      orderItems = cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));
    } else {
      // Usuario guest: obtener items del DTO
      if (!createOrderDto.items || createOrderDto.items.length === 0) {
        throw new BadRequestException(
          'Cart items are required for guest orders',
        );
      }

      orderItems = createOrderDto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));
    }

    // 2. Validar inventario y calcular totales
    let subtotal = 0;
    const validatedItems: Array<{
      productId: number;
      quantity: number;
      product: Product;
    }> = [];

    for (const item of orderItems) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      if (!product.published) {
        throw new BadRequestException(
          `Product ${product.name} is not available`,
        );
      }

      if (product.inventory < item.quantity) {
        throw new BadRequestException(
          `Insufficient inventory for ${product.name}. Available: ${product.inventory}`,
        );
      }

      subtotal += Number(product.price) * item.quantity;
      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        product,
      });
    }

    // 3. Validar y crear la dirección de envío (solo para delivery)
    let shippingAddress: ShippingAddress | null = null;
    let shippingCost = 0;

    if (createOrderDto.deliveryMethod === DeliveryMethod.DELIVERY) {
      if (!createOrderDto.shippingAddress) {
        throw new BadRequestException(
          'Shipping address is required for delivery orders',
        );
      }

      shippingAddress = this.shippingAddressRepository.create({
        ...createOrderDto.shippingAddress,
        country: createOrderDto.shippingAddress.country || 'Venezuela',
        latitude: createOrderDto.shippingAddress.latitude || null,
        longitude: createOrderDto.shippingAddress.longitude || null,
      });
      await this.shippingAddressRepository.save(shippingAddress);

      // Calcular costo de envío si es necesario
      shippingCost = 0; // TODO: Implementar cálculo de envío basado en ubicación
    }

    const tax = 0; // Implementar cálculo de impuestos si es necesario
    const total = subtotal + tax + shippingCost;

    // 4. Crear la información de pago
    const paymentInfo = this.paymentInfoRepository.create({
      method: createOrderDto.paymentMethod,
      status: PaymentStatus.PENDING,
      ...createOrderDto.paymentDetails,
    });
    await this.paymentInfoRepository.save(paymentInfo);

    // 5. Crear la orden
    const order = new Order();
    order.orderNumber = this.generateOrderNumber();
    order.userId = userId || null;
    order.guestEmail =
      !userId
        ? createOrderDto.shippingAddress?.email || createOrderDto.guestEmail || null
        : null;
    order.deliveryMethod = createOrderDto.deliveryMethod;
    order.shippingAddressId = shippingAddress?.id || null;
    order.paymentInfoId = paymentInfo.id;
    order.status = OrderStatus.PENDING;
    order.subtotal = subtotal;
    order.tax = tax;
    order.shipping = shippingCost;
    order.total = total;
    order.notes = createOrderDto.notes || null;

    await this.orderRepository.save(order);

    // 6. Crear los items de la orden
    const createdOrderItems: OrderItem[] = [];

    for (const item of validatedItems) {
      const orderItem = this.orderItemRepository.create({
        orderId: order.id,
        productId: item.product.id,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.quantity,
        price: item.product.price,
        subtotal: Number(item.product.price) * item.quantity,
      });

      createdOrderItems.push(orderItem);
    }

    await this.orderItemRepository.save(createdOrderItems);

    // 7. Reducir inventario
    for (const item of validatedItems) {
      await this.productRepository.decrement(
        { id: item.productId },
        'inventory',
        item.quantity,
      );
    }

    // 8. Vaciar el carrito (solo si es usuario autenticado)
    if (userId) {
      const cart = await this.cartRepository.findOne({
        where: { userId },
      });
      if (cart) {
        await this.cartRepository.remove(cart);
      }
    }

    // 9. Si el usuario invitado quiere crear cuenta
    if (!userId && createOrderDto.createAccount && createOrderDto.password && createOrderDto.shippingAddress) {
      const hashedPassword = await bcrypt.hash(createOrderDto.password, 10);

      const newUser = this.userRepository.create({
        firstName: createOrderDto.shippingAddress.firstName,
        lastName: createOrderDto.shippingAddress.lastName,
        email: createOrderDto.shippingAddress.email,
        password: hashedPassword,
        role: UserRole.USER,
      });

      const savedUser = await this.userRepository.save(newUser);

      // Asociar la orden al nuevo usuario
      order.userId = savedUser.id;
      await this.orderRepository.save(order);
    }

    // 10. Enviar email de confirmación
    const finalOrder = await this.findOne(order.id);
    await this.emailService.sendOrderConfirmation(finalOrder);

    // 11. Retornar la orden completa
    return finalOrder;
  }

  /**
   * Sube el comprobante de pago
   */
  async uploadPaymentReceipt(
    orderId: number,
    receiptUrl: string,
    receiptKey: string,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['paymentInfo'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    order.paymentInfo.receiptUrl = receiptUrl;
    order.paymentInfo.receiptKey = receiptKey;
    order.paymentInfo.status = PaymentStatus.PENDING;
    order.status = OrderStatus.PAYMENT_REVIEW;

    await this.paymentInfoRepository.save(order.paymentInfo);
    await this.orderRepository.save(order);

    return this.findOne(orderId);
  }

  /**
   * Actualiza el estado de una orden (solo admin)
   */
  async updateOrderStatus(
    orderId: number,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['paymentInfo'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const previousStatus = order.status;
    const previousPaymentStatus = order.paymentInfo.status;

    if (updateOrderStatusDto.orderStatus) {
      order.status = updateOrderStatusDto.orderStatus;
    }

    if (updateOrderStatusDto.paymentStatus) {
      order.paymentInfo.status = updateOrderStatusDto.paymentStatus;
      await this.paymentInfoRepository.save(order.paymentInfo);
    }

    if (updateOrderStatusDto.adminNotes) {
      order.adminNotes = updateOrderStatusDto.adminNotes;
    }

    await this.orderRepository.save(order);

    const updatedOrder = await this.findOne(orderId);

    // Enviar notificaciones según el cambio de estado
    if (
      previousPaymentStatus !== PaymentStatus.VERIFIED &&
      order.paymentInfo.status === PaymentStatus.VERIFIED
    ) {
      await this.emailService.sendPaymentConfirmed(updatedOrder);
    }

    if (
      previousStatus !== OrderStatus.SHIPPED &&
      order.status === OrderStatus.SHIPPED
    ) {
      await this.emailService.sendOrderShipped(updatedOrder);
    }

    if (
      previousStatus !== OrderStatus.DELIVERED &&
      order.status === OrderStatus.DELIVERED
    ) {
      await this.emailService.sendOrderDelivered(updatedOrder);
    }

    return updatedOrder;
  }

  /**
   * Obtiene todas las órdenes (admin) o las órdenes del usuario
   */
  async findAll(userId?: number, isAdmin = false): Promise<Order[]> {
    if (isAdmin) {
      return this.orderRepository.find({
        order: { createdAt: 'DESC' },
      });
    }

    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }

    return this.orderRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtiene una orden por ID
   */
  async findOne(orderId: number, userId?: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Verificar que el usuario tenga acceso a esta orden
    if (userId && order.userId !== userId) {
      throw new UnauthorizedException('Access denied to this order');
    }

    return order;
  }

  /**
   * Obtiene una orden por número de orden
   */
  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
    });

    if (!order) {
      throw new NotFoundException(`Order with number ${orderNumber} not found`);
    }

    return order;
  }

  /**
   * Cancela una orden
   */
  async cancelOrder(orderId: number, userId?: number): Promise<Order> {
    const order = await this.findOne(orderId, userId);

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.PAYMENT_REVIEW
    ) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    // Restaurar inventario
    for (const item of order.items) {
      await this.productRepository.increment(
        { id: item.productId },
        'inventory',
        item.quantity,
      );
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    return this.findOne(orderId);
  }

  /**
   * Obtiene estadísticas del dashboard de admin
   */
  async getAdminStats(): Promise<any> {
    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
    ] = await Promise.all([
      this.orderRepository.count(),
      this.orderRepository.count({ where: { status: OrderStatus.PENDING } }),
      this.orderRepository.count({ where: { status: OrderStatus.CONFIRMED } }),
      this.orderRepository.count({ where: { status: OrderStatus.SHIPPED } }),
      this.orderRepository.count({ where: { status: OrderStatus.DELIVERED } }),
    ]);

    // Calcular ingresos totales
    const orders = await this.orderRepository.find({
      where: [
        { status: OrderStatus.CONFIRMED },
        { status: OrderStatus.PROCESSING },
        { status: OrderStatus.SHIPPED },
        { status: OrderStatus.DELIVERED },
      ],
    });

    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );

    // Órdenes de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await this.orderRepository.count({
      where: {
        createdAt: new Date(today),
      },
    });

    // Órdenes del mes
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :startOfMonth', { startOfMonth })
      .getCount();

    return {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      todayOrders,
      monthOrders,
      ordersByStatus: {
        pending: pendingOrders,
        confirmed: confirmedOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
      },
    };
  }

  /**
   * Filtra órdenes con opciones avanzadas
   */
  async filterOrders(filters: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; total: number }> {
    const query = this.orderRepository.createQueryBuilder('order');

    if (filters.status) {
      query
        .andWhere('order.status = :status', { status: filters.status });
    }

    if (filters.paymentStatus) {
      query
        .leftJoinAndSelect('order.paymentInfo', 'paymentInfo')
        .andWhere('paymentInfo.status = :paymentStatus', {
          paymentStatus: filters.paymentStatus,
        });
    }

    if (filters.startDate) {
      query.andWhere('order.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query.andWhere('order.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.search) {
      query.andWhere(
        '(order.orderNumber LIKE :search OR order.guestEmail LIKE :search)',
        {
          search: `%${filters.search}%`,
        },
      );
    }

    query.andWhere('order.status != :status', { status: OrderStatus.PENDING })


    const total = await query.getCount();

    query.orderBy('order.createdAt', 'DESC');

    if (filters.limit) {
      query.take(filters.limit);
    }

    if (filters.offset) {
      query.skip(filters.offset);
    }

    const orders = await query.getMany();

    return { orders, total };
  }

  /**
   * Exporta órdenes a CSV
   */
  async exportToCSV(filters?: {
    status?: OrderStatus;
    startDate?: Date;
    endDate?: Date;
  }): Promise<string> {
    const { orders } = await this.filterOrders({
      ...filters,
      limit: 10000, // Límite máximo para export
    });

    // Header del CSV
    let csv =
      'Número de Orden,Fecha,Cliente,Email,Estado,Estado de Pago,Subtotal,Impuestos,Envío,Total\n';

    // Agregar filas
    for (const order of orders) {
      const customerName = order.shippingAddress
        ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`
        : 'N/A';
      const email = order.user?.email || order.guestEmail || 'N/A';

      csv += `${order.orderNumber},`;
      csv += `${new Date(order.createdAt).toLocaleDateString()},`;
      csv += `"${customerName}",`;
      csv += `${email},`;
      csv += `${order.status},`;
      csv += `${order.paymentInfo?.status || 'N/A'},`;
      csv += `${order.subtotal},`;
      csv += `${order.tax},`;
      csv += `${order.shipping},`;
      csv += `${order.total}\n`;
    }

    return csv;
  }
}

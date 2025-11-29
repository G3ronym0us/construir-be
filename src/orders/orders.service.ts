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
import { DiscountsService } from '../discounts/discounts.service';
import { Discount } from '../discounts/discount.entity';
import { BanksService } from '../banks/banks.service';
import { GuestCustomersService } from './guest-customers.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
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
    private readonly discountsService: DiscountsService,
    private readonly banksService: BanksService,
    private readonly guestCustomersService: GuestCustomersService,
    private readonly exchangeRatesService: ExchangeRatesService,
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
    let orderItems: Array<{ productUuid: string; quantity: number }> = [];

    if (userId) {
      // Usuario autenticado: obtener items del carrito backend
      const cart = await this.cartRepository.findOne({
        where: { userId },
        relations: {
          items: {
            product: true,
          },
        },
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      orderItems = cart.items.map((item) => ({
        productUuid: item.product.uuid,
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
        productUuid: item.productUuid,
        quantity: item.quantity,
      }));
    }

    // 2. Validar inventario y calcular totales
    let subtotal = 0;
    const validatedItems: Array<{
      productUuid: string;
      quantity: number;
      product: Product;
    }> = [];

    for (const item of orderItems) {
      const product = await this.productRepository.findOne({
        where: { uuid: item.productUuid },
      });

      if (!product) {
        throw new NotFoundException(`Product ${item.productUuid} not found`);
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
        productUuid: item.productUuid,
        quantity: item.quantity,
        product,
      });
    }

    // 3. Validar customerInfo para usuarios guest
    if (!userId && !createOrderDto.customerInfo) {
      throw new BadRequestException(
        'Customer information is required for guest orders',
      );
    }

    // 4. Validar y crear la dirección de envío (solo para delivery)
    let shippingAddress: ShippingAddress | null = null;
    let shippingCost = 0;

    if (createOrderDto.deliveryMethod === DeliveryMethod.DELIVERY) {
      if (!createOrderDto.shippingAddress) {
        throw new BadRequestException(
          'Shipping address is required for delivery orders',
        );
      }

      // Combinar customerInfo con shippingAddress
      shippingAddress = this.shippingAddressRepository.create({
        // Datos del cliente (desde customerInfo si es guest, sino desde shippingAddress)
        identificationType: createOrderDto.customerInfo?.identificationType,
        identificationNumber: createOrderDto.customerInfo?.identificationNumber,
        firstName: createOrderDto.customerInfo?.firstName,
        lastName: createOrderDto.customerInfo?.lastName,
        email: createOrderDto.customerInfo?.email,
        phone: createOrderDto.customerInfo?.phone,
        // Datos de dirección
        ...createOrderDto.shippingAddress,
        country: createOrderDto.shippingAddress.country || 'Venezuela',
        latitude: createOrderDto.shippingAddress.latitude || null,
        longitude: createOrderDto.shippingAddress.longitude || null,
      });
      await this.shippingAddressRepository.save(shippingAddress);

      // Calcular costo de envío si es necesario
      shippingCost = 0; // TODO: Implementar cálculo de envío basado en ubicación
    }

    // 5. Guardar/actualizar datos de guest customer para futuras compras
    if (!userId && createOrderDto.customerInfo) {
      await this.guestCustomersService.createOrUpdate(
        createOrderDto.customerInfo,
        createOrderDto.shippingAddress,
      );
    }

    const tax = 0; // Implementar cálculo de impuestos si es necesario

    // 3.5 Validar y aplicar descuento si existe
    let discountAmount = 0;
    let discount: Discount | null = null;
    const orderTotalBeforeDiscount = subtotal + tax + shippingCost;

    if (createOrderDto.discountCode) {
      const discountValidation = await this.discountsService.validateDiscount(
        createOrderDto.discountCode,
        orderTotalBeforeDiscount,
      );

      if (!discountValidation.valid) {
        throw new BadRequestException(
          discountValidation.error || 'Invalid discount code',
        );
      }

      discountAmount = discountValidation.discount?.discountAmount || 0;
      discount = await this.discountsService.findByCode(
        createOrderDto.discountCode,
      );
    }

    const total = Math.max(0, orderTotalBeforeDiscount - discountAmount);

    // 3.6 Obtener tipo de cambio actual y calcular precios en VES
    let exchangeRate: number | null = null;
    let subtotalVes: number | null = null;
    let totalVes: number | null = null;

    try {
      exchangeRate = await this.exchangeRatesService.getRate();
      subtotalVes = Number((subtotal * exchangeRate).toFixed(2));
      totalVes = Number((total * exchangeRate).toFixed(2));
    } catch (error) {
      // Si no hay tipo de cambio disponible, continuar sin precios VES
      console.warn(
        'Exchange rate not available, continuing without VES prices',
      );
    }

    // 4. Crear la información de pago
    const paymentInfo = this.paymentInfoRepository.create({
      method: createOrderDto.paymentMethod,
      status: PaymentStatus.PENDING,
      senderName: createOrderDto.paymentDetails.senderName,
      senderBank: createOrderDto.paymentDetails.senderBank,
      phoneNumber: createOrderDto.paymentDetails.phoneNumber,
      cedula: createOrderDto.paymentDetails.cedula,
      referenceCode: createOrderDto.paymentDetails.referenceCode,
      accountName: createOrderDto.paymentDetails.accountName,
      referenceNumber: createOrderDto.paymentDetails.referenceNumber,
      notes: createOrderDto.paymentDetails.notes,
    });

    // Buscar y asignar banco para PagoMóvil
    if (createOrderDto.paymentDetails.bankCode) {
      const bank = await this.banksService.findByCode(
        createOrderDto.paymentDetails.bankCode,
      );
      if (!bank) {
        throw new BadRequestException(
          `Bank with code ${createOrderDto.paymentDetails.bankCode} not found`,
        );
      }
      paymentInfo.bank = bank;
      paymentInfo.bankId = bank.id;
    }

    // Buscar y asignar banco para Transferencia
    if (createOrderDto.paymentDetails.transferBankCode) {
      const transferBank = await this.banksService.findByCode(
        createOrderDto.paymentDetails.transferBankCode,
      );
      if (!transferBank) {
        throw new BadRequestException(
          `Bank with code ${createOrderDto.paymentDetails.transferBankCode} not found`,
        );
      }
      paymentInfo.transferBank = transferBank;
      paymentInfo.transferBankId = transferBank.id;
    }

    await this.paymentInfoRepository.save(paymentInfo);

    // 6. Crear la orden
    const order = new Order();
    order.orderNumber = this.generateOrderNumber();
    order.userId = userId || null;
    order.guestEmail = !userId
      ? createOrderDto.customerInfo?.email || null
      : null;
    order.deliveryMethod = createOrderDto.deliveryMethod;
    order.shippingAddressId = shippingAddress?.id || null;
    order.paymentInfoId = paymentInfo.id;
    order.status = OrderStatus.PENDING;
    order.subtotal = subtotal;
    order.tax = tax;
    order.shipping = shippingCost;
    order.discountId = discount?.id || null;
    order.discountCode = discount?.code || null;
    order.discountAmount = discountAmount;
    order.total = total;
    order.exchangeRate = exchangeRate;
    order.subtotalVes = subtotalVes;
    order.totalVes = totalVes;
    order.notes = createOrderDto.notes || null;

    await this.orderRepository.save(order);

    // 6. Crear los items de la orden
    const createdOrderItems: OrderItem[] = [];

    for (const item of validatedItems) {
      const itemSubtotal = Number(item.product.price) * item.quantity;
      const itemPriceVes = exchangeRate
        ? Number((Number(item.product.price) * exchangeRate).toFixed(2))
        : null;
      const itemSubtotalVes = exchangeRate
        ? Number((itemSubtotal * exchangeRate).toFixed(2))
        : null;

      const orderItem = this.orderItemRepository.create({
        orderId: order.id,
        productId: item.product.id,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.quantity,
        price: item.product.price,
        subtotal: itemSubtotal,
        priceVes: itemPriceVes,
        subtotalVes: itemSubtotalVes,
      });

      createdOrderItems.push(orderItem);
    }

    await this.orderItemRepository.save(createdOrderItems);

    // 7. Reducir inventario
    for (const item of validatedItems) {
      await this.productRepository.decrement(
        { uuid: item.productUuid },
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
    if (
      !userId &&
      createOrderDto.createAccount &&
      createOrderDto.password &&
      createOrderDto.customerInfo
    ) {
      const hashedPassword = await bcrypt.hash(createOrderDto.password, 10);

      const newUser = this.userRepository.create({
        firstName: createOrderDto.customerInfo.firstName,
        lastName: createOrderDto.customerInfo.lastName,
        email: createOrderDto.customerInfo.email,
        password: hashedPassword,
        role: UserRole.USER,
      });

      const savedUser = await this.userRepository.save(newUser);

      // Asociar la orden al nuevo usuario
      order.userId = savedUser.id;
      await this.orderRepository.save(order);
    }

    // 10. Incrementar uso del cupón si se aplicó uno
    if (discount) {
      await this.discountsService.incrementUsage(discount.uuid);
    }

    // 11. Enviar email de confirmación
    const finalOrder = await this.findOneByUuid(order.uuid);
    await this.emailService.sendOrderConfirmation(finalOrder);

    // 12. Retornar la orden completa
    return finalOrder;
  }

  /**
   * Sube el comprobante de pago
   */
  async uploadPaymentReceipt(
    orderUuid: string,
    receiptUrl: string,
    receiptKey: string,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { uuid: orderUuid },
      relations: ['paymentInfo'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderUuid} not found`);
    }

    order.paymentInfo.receiptUrl = receiptUrl;
    order.paymentInfo.receiptKey = receiptKey;
    order.paymentInfo.status = PaymentStatus.PENDING;
    order.status = OrderStatus.PAYMENT_REVIEW;

    await this.paymentInfoRepository.save(order.paymentInfo);
    return this.orderRepository.save(order);
  }

  /**
   * Actualiza el estado de una orden (solo admin)
   */
  async updateOrderStatus(
    uuid: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { uuid },
      relations: ['paymentInfo'],
    });

    if (!order) {
      throw new NotFoundException(`Order with UUID ${uuid} not found`);
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

    const updatedOrder = await this.findOneByUuid(order.uuid);

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
   * Obtiene una orden por UUID
   */
  async findOneByUuid(uuid: string, userId?: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { uuid },
    });

    if (!order) {
      throw new NotFoundException(`Order with UUID ${uuid} not found`);
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
  async cancelOrder(uuid: string, userId?: number): Promise<Order> {
    const order = await this.findOneByUuid(uuid, userId);

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
    return this.orderRepository.save(order);
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
   * Obtiene estadísticas del dashboard con comparación mensual
   */
  async getDashboardStats(month?: string): Promise<any> {
    // Determinar el mes actual o el especificado
    const targetDate = month ? new Date(month + '-01') : new Date();
    const startOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      1,
    );
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0,
    );
    endOfMonth.setHours(23, 59, 59, 999);

    // Mes anterior
    const startOfPrevMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() - 1,
      1,
    );
    startOfPrevMonth.setHours(0, 0, 0, 0);

    const endOfPrevMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      0,
    );
    endOfPrevMonth.setHours(23, 59, 59, 999);

    // Obtener órdenes confirmadas del mes actual
    const currentMonthOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :start', { start: startOfMonth })
      .andWhere('order.createdAt <= :end', { end: endOfMonth })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [
          OrderStatus.CONFIRMED,
          OrderStatus.PROCESSING,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
        ],
      })
      .getMany();

    // Obtener órdenes confirmadas del mes anterior
    const prevMonthOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :start', { start: startOfPrevMonth })
      .andWhere('order.createdAt <= :end', { end: endOfPrevMonth })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [
          OrderStatus.CONFIRMED,
          OrderStatus.PROCESSING,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
        ],
      })
      .getMany();

    // Calcular totales del mes actual
    const currentRevenue = currentMonthOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );
    const currentRevenueVes = currentMonthOrders.reduce(
      (sum, order) => sum + (order.totalVes ? Number(order.totalVes) : 0),
      0,
    );
    const currentSalesCount = currentMonthOrders.length;

    // Calcular totales del mes anterior
    const prevRevenue = prevMonthOrders.reduce(
      (sum, order) => sum + Number(order.total),
      0,
    );
    const prevRevenueVes = prevMonthOrders.reduce(
      (sum, order) => sum + (order.totalVes ? Number(order.totalVes) : 0),
      0,
    );
    const prevSalesCount = prevMonthOrders.length;

    // Calcular porcentajes de cambio
    const revenueChangePercent =
      prevRevenue > 0
        ? Number(
            (((currentRevenue - prevRevenue) / prevRevenue) * 100).toFixed(2),
          )
        : 0;

    const salesChangePercent =
      prevSalesCount > 0
        ? Number(
            (
              ((currentSalesCount - prevSalesCount) / prevSalesCount) *
              100
            ).toFixed(2),
          )
        : 0;

    // Formatear período
    const formatPeriod = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    return {
      currentMonth: {
        revenueUSD: Number(currentRevenue.toFixed(2)),
        revenueVES: Number(currentRevenueVes.toFixed(2)),
        salesCount: currentSalesCount,
        period: formatPeriod(targetDate),
      },
      previousMonth: {
        revenueUSD: Number(prevRevenue.toFixed(2)),
        revenueVES: Number(prevRevenueVes.toFixed(2)),
        salesCount: prevSalesCount,
        period: formatPeriod(startOfPrevMonth),
      },
      comparison: {
        revenueChangePercent,
        salesChangePercent,
      },
    };
  }

  /**
   * Obtiene productos más y menos vendidos
   */
  async getTopProducts(month?: string, limit: number = 10): Promise<any> {
    // Determinar el mes
    const targetDate = month ? new Date(month + '-01') : new Date();
    const startOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      1,
    );
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0,
    );
    endOfMonth.setHours(23, 59, 59, 999);

    // Productos más vendidos
    const topSelling = await this.orderItemRepository
      .createQueryBuilder('item')
      .select('item.product.uuid', 'productUuid')
      .addSelect('item.productName', 'productName')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .addSelect('COUNT(DISTINCT item.orderId)', 'orderCount')
      .innerJoin('item.order', 'order')
      .innerJoin('item.product', 'product')
      .where('order.createdAt >= :start', { start: startOfMonth })
      .andWhere('order.createdAt <= :end', { end: endOfMonth })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [
          OrderStatus.CONFIRMED,
          OrderStatus.PROCESSING,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
        ],
      })
      .groupBy('item.productId')
      .addGroupBy('item.productName')
      .orderBy('totalQuantity', 'DESC')
      .limit(limit)
      .getRawMany();

    // Productos menos vendidos
    const leastSelling = await this.orderItemRepository
      .createQueryBuilder('item')
      .select('product.uuid', 'productUuid')
      .addSelect('item.productName', 'productName')
      .addSelect('SUM(item.quantity)', 'totalQuantity')
      .addSelect('SUM(item.subtotal)', 'totalRevenue')
      .addSelect('COUNT(DISTINCT item.orderId)', 'orderCount')
      .innerJoin('item.order', 'order')
      .innerJoin('item.product', 'product')
      .where('order.createdAt >= :start', { start: startOfMonth })
      .andWhere('order.createdAt <= :end', { end: endOfMonth })
      .andWhere('order.status IN (:...statuses)', {
        statuses: [
          OrderStatus.CONFIRMED,
          OrderStatus.PROCESSING,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
        ],
      })
      .groupBy('item.productId')
      .addGroupBy('item.productName')
      .orderBy('totalQuantity', 'ASC')
      .limit(limit)
      .getRawMany();

    const formatPeriod = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    return {
      topSelling: topSelling.map((p) => ({
        productUuid: p.productUuid,
        productName: p.productName,
        totalQuantity: parseInt(p.totalQuantity),
        totalRevenue: Number(Number(p.totalRevenue).toFixed(2)),
        orderCount: parseInt(p.orderCount),
      })),
      leastSelling: leastSelling.map((p) => ({
        productUuid: p.productUuid,
        productName: p.productName,
        totalQuantity: parseInt(p.totalQuantity),
        totalRevenue: Number(Number(p.totalRevenue).toFixed(2)),
        orderCount: parseInt(p.orderCount),
      })),
      period: formatPeriod(targetDate),
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
      query.andWhere('order.status = :status', { status: filters.status });
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

    query.andWhere('order.status != :status', { status: OrderStatus.PENDING });

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

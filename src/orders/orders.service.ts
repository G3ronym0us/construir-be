import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
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
import { IVA_RATES, IvaType } from '../products/enums/iva-type.enum';
import { BanksService } from '../banks/banks.service';
import { GuestCustomersService } from './guest-customers.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { OrderPricingService } from './order-pricing.service';
import { QuoteOrderDto, QuoteOrderItemDto } from './dto/quote-order.dto';
import { round2 } from '../products/iva.util';
import * as bcrypt from 'bcrypt';

export type QuoteIssue =
  | { code: 'NOT_FOUND' }
  | { code: 'NOT_PUBLISHED' }
  | { code: 'INSUFFICIENT_INVENTORY'; available: number };

export interface QuoteItem {
  productUuid: string;
  name: string | null;
  sku: string | null;
  quantity: number;
  ivaType: number | null;
  ivaRate: number | null;
  unitPrice: number | null;
  lineTotal: number | null;
  discount: number | null;
  base: number | null;
  iva: number | null;
  total: number | null;
  unitPriceVes: number | null;
  totalVes: number | null;
  issue: QuoteIssue | null;
}

export interface OrderQuote {
  exchangeRate: number | null;
  rateDate: string | null;
  items: QuoteItem[];
  totals: {
    itemsTotal: number;
    discount: number;
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    subtotalVes: number | null;
    taxVes: number | null;
    discountVes: number | null;
    totalVes: number | null;
  };
  canCheckout: boolean;
}

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
    private readonly orderPricingService: OrderPricingService,
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
   * Previsualiza el desglose de un pedido sin persistir nada.
   *
   * Existe porque el checkout no tenía forma de pedirle el desglose al
   * backend: los totales sólo existían después del POST /orders, así que el
   * frontend calculaba su propio IVA y mostraba un número que el backend
   * nunca validó.
   *
   * A diferencia de `createOrder`, no lanza excepción por stock insuficiente
   * ni por producto despublicado: los reporta como `issue` por ítem y baja
   * `canCheckout`. Un 400 dejaría la página de checkout en blanco sin decirle
   * al cliente cuál de sus productos falló.
   */
  async quoteOrder(quoteOrderDto: QuoteOrderDto): Promise<OrderQuote> {
    // Anotamos el tipo de retorno explícitamente: sin esto, TypeScript infiere
    // una unión discriminada por rama (product: null sólo en NOT_FOUND) y
    // termina angostando `issue` en el filtro de abajo al punto de marcar la
    // comparación con 'NOT_FOUND' como imposible, aunque la lógica es correcta.
    const resolved = await Promise.all(
      quoteOrderDto.items.map(
        async (
          item,
        ): Promise<{
          item: QuoteOrderItemDto;
          product: Product | null;
          issue: QuoteIssue | null;
        }> => {
          const product = await this.productRepository.findOne({
            where: { uuid: item.productUuid },
          });

          if (!product) {
            return { item, product: null, issue: { code: 'NOT_FOUND' } };
          }

          if (!product.published) {
            return {
              item,
              product,
              issue: { code: 'NOT_PUBLISHED' },
            };
          }

          if (product.inventory < item.quantity) {
            return {
              item,
              product,
              issue: {
                code: 'INSUFFICIENT_INVENTORY' as const,
                available: product.inventory,
              },
            };
          }

          return { item, product, issue: null };
        },
      ),
    );

    // Sólo se cotiza lo que está a la venta. El stock insuficiente sí se
    // cotiza: el cliente necesita ver el monto para poder ajustar la cantidad.
    const priceable = resolved.filter(
      (entry) =>
        entry.product !== null &&
        entry.issue?.code !== 'NOT_FOUND' &&
        entry.issue?.code !== 'NOT_PUBLISHED',
    );

    const pricing = await this.orderPricingService.price({
      items: priceable.map((entry) => ({
        product: entry.product as Product,
        quantity: entry.item.quantity,
      })),
      discountCode: quoteOrderDto.discountCode,
    });

    // Asociamos por posición, no por UUID: `price()` arma `pricing.lines` con
    // `items.map((item, index) => ...)`, así que `pricing.lines[i]`
    // corresponde exactamente a `priceable[i]`, en el mismo orden. Un `Map`
    // por UUID de producto colapsa cuando el mismo producto aparece dos veces
    // en el pedido (carrito con el mismo ítem agregado en momentos distintos
    // sin fusionar cantidades): sólo sobrevive la última línea, y todas las
    // entradas repetidas terminan mostrando su monto. Usamos la identidad de
    // cada `entry` de `priceable` como clave para no tener que llevar el
    // índice a mano.
    const lineByEntry = new Map(
      priceable.map((entry, index) => [entry, pricing.lines[index]]),
    );

    const items: QuoteItem[] = resolved.map((entry) => {
      const { item, product, issue } = entry;
      const line = lineByEntry.get(entry);
      const ivaRate = product
        ? IVA_RATES[product.ivaType ?? IvaType.NORMAL] * 100
        : null;

      return {
        productUuid: item.productUuid,
        name: product?.name ?? null,
        sku: product?.sku ?? null,
        quantity: item.quantity,
        ivaType: product?.ivaType ?? null,
        ivaRate,
        unitPrice: line?.unitPrice ?? null,
        lineTotal: line?.lineTotal ?? null,
        discount: line?.discount ?? null,
        base: line?.base ?? null,
        iva: line?.iva ?? null,
        total: line?.total ?? null,
        unitPriceVes:
          product?.priceWithIvaVes != null
            ? Number(product.priceWithIvaVes)
            : null,
        // Se toma de la línea, ya convertida por OrderPricingService, para que
        // la suma de los renglones dé exactamente el total del bloque totals.
        totalVes: line?.totalVes ?? null,
        issue,
      };
    });

    return {
      exchangeRate: pricing.exchangeRate,
      rateDate: pricing.rateDate,
      items,
      totals: {
        itemsTotal: pricing.itemsTotal,
        discount: pricing.discount,
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        shipping: pricing.shipping,
        total: pricing.total,
        subtotalVes: pricing.subtotalVes,
        taxVes: pricing.taxVes,
        discountVes: pricing.discountVes,
        totalVes: pricing.totalVes,
      },
      canCheckout: items.every((item) => item.issue === null),
    };
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

    // 2. Validar inventario y disponibilidad
    const validatedItems: Array<{ product: Product; quantity: number }> = [];

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

      validatedItems.push({ product, quantity: item.quantity });
    }

    // 3. Validar customerInfo para usuarios guest
    if (!userId && !createOrderDto.customerInfo) {
      throw new BadRequestException(
        'Customer information is required for guest orders',
      );
    }

    // 3.5 Calcular el desglose con el calculador único, el mismo que usa
    //     POST /orders/quote. Nunca se aceptan montos del cliente.
    //
    // Va acá, antes de cualquier escritura persistente (dirección de envío,
    // guest customer), a propósito: un cupón inválido (400, desde `price()`)
    // o una tasa que rotó desde el quote (409, más abajo) no son casos raros
    // — son el camino esperado cuando el cliente tarda en completar el
    // checkout. Si el cálculo corriera después de guardar la dirección o el
    // guest customer, cada uno de esos rechazos dejaría una fila huérfana sin
    // orden que la referencie.
    const pricing = await this.orderPricingService.price({
      items: validatedItems,
      discountCode: createOrderDto.discountCode,
    });

    // Se factura con la tasa publicada. Si cambió entre que el cliente vio el
    // desglose y confirmó, el total ya no es el que aceptó: se rechaza para
    // que la UI le pida reconfirmación en vez de cobrarle otro monto.
    if (
      createOrderDto.expectedExchangeRate !== undefined &&
      pricing.exchangeRate !== null &&
      Number(createOrderDto.expectedExchangeRate) !== pricing.exchangeRate
    ) {
      throw new ConflictException({
        message:
          'La tasa de cambio cambió desde que se calculó el pedido. Confirmá el nuevo total.',
        code: 'EXCHANGE_RATE_CHANGED',
        exchangeRate: pricing.exchangeRate,
        rateDate: pricing.rateDate,
        totals: {
          subtotal: pricing.subtotal,
          tax: pricing.tax,
          total: pricing.total,
          subtotalVes: pricing.subtotalVes,
          taxVes: pricing.taxVes,
          totalVes: pricing.totalVes,
        },
      });
    }

    // 4. Validar y crear la dirección de envío (solo para delivery)
    let shippingAddress: ShippingAddress | null = null;

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

      // El costo de envío queda en 0: `pricing.shipping` lo trae del
      // calculador (ver el TODO real en OrderPricingService.SHIPPING) hasta
      // que se implemente el cálculo basado en ubicación.
    }

    // 5. Guardar/actualizar datos de guest customer para futuras compras
    let guestCustomerId: number | null = null;
    if (!userId && createOrderDto.customerInfo) {
      const guestCustomer = await this.guestCustomersService.createOrUpdate(
        createOrderDto.customerInfo,
        createOrderDto.shippingAddress,
      );
      guestCustomerId = guestCustomer.id;
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
    order.guestCustomerId = guestCustomerId;
    order.deliveryMethod = createOrderDto.deliveryMethod;
    order.shippingAddressId = shippingAddress?.id || null;
    order.paymentInfoId = paymentInfo.id;
    order.status = OrderStatus.ON_HOLD;
    order.subtotal = pricing.subtotal;
    order.tax = pricing.tax;
    order.shipping = pricing.shipping;
    order.discountId = pricing.discountId;
    order.discountCode = pricing.discountCode;
    order.discountAmount = pricing.discount;
    order.total = pricing.total;
    order.exchangeRate = pricing.exchangeRate;
    order.subtotalVes = pricing.subtotalVes;
    order.taxVes = pricing.taxVes;
    order.discountAmountVes = pricing.discountVes;
    order.totalVes = pricing.totalVes;
    order.notes = createOrderDto.notes || null;

    await this.orderRepository.save(order);

    // 6. Crear los items de la orden
    const createdOrderItems: OrderItem[] = [];

    for (const line of pricing.lines) {
      const orderItem = this.orderItemRepository.create({
        orderId: order.id,
        productId: line.product.id,
        productName: line.product.name,
        productSku: line.product.sku,
        quantity: line.quantity,
        // `price` y `subtotal` son inclusivos de IVA; `subtotal` ya viene neto
        // de la porción de descuento que le tocó a la línea.
        price: line.unitPrice,
        subtotal: line.total,
        priceVes:
          pricing.exchangeRate !== null
            ? round2(line.unitPrice * pricing.exchangeRate)
            : null,
        // Del desglose de la línea, no recalculado, para que los montos VES de
        // los items sumen exactamente los de la orden.
        subtotalVes: line.totalVes,
      });

      createdOrderItems.push(orderItem);
    }

    await this.orderItemRepository.save(createdOrderItems);

    // 7. Reducir inventario
    for (const item of validatedItems) {
      await this.productRepository.decrement(
        { uuid: item.product.uuid },
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
    // `pricing.discountUuid` ya viene resuelto de `price()`: no hace falta
    // volver a buscar el cupón por código acá. Buscarlo de nuevo después de
    // persistir la orden podía devolver 404 si alguien lo borraba en esa
    // ventana, dejando la orden creada pero la respuesta al cliente rota.
    if (pricing.discountUuid) {
      await this.discountsService.incrementUsage(pricing.discountUuid);
    }

    // 11. Enviar email de confirmación
    const finalOrder = await this.findOneByUuid(order.uuid);
    await this.emailService.sendOrderConfirmation(finalOrder);
    await this.emailService.sendAdminNewOrder(finalOrder);

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

    // Enviar notificación si el pago fue verificado manualmente por el admin
    if (
      previousPaymentStatus !== PaymentStatus.VERIFIED &&
      order.paymentInfo.status === PaymentStatus.VERIFIED
    ) {
      await this.emailService.sendPaymentConfirmed(updatedOrder);
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

    if (order.status !== OrderStatus.ON_HOLD) {
      throw new BadRequestException('Only on-hold orders can be cancelled');
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
    const cancelledOrder = await this.orderRepository.save(order);
    const fullOrder = await this.findOneByUuid(cancelledOrder.uuid);
    await this.emailService.sendOrderCanceled(fullOrder);
    await this.emailService.sendAdminOrderCancelled(fullOrder);
    return cancelledOrder;
  }

  /**
   * Obtiene estadísticas del dashboard de admin
   */
  async getAdminStats(): Promise<any> {
    const [totalOrders, onHoldOrders, pendingOrders, completedOrders] =
      await Promise.all([
        this.orderRepository.count(),
        this.orderRepository.count({ where: { status: OrderStatus.ON_HOLD } }),
        this.orderRepository.count({ where: { status: OrderStatus.PENDING } }),
        this.orderRepository.count({
          where: { status: OrderStatus.COMPLETED },
        }),
      ]);

    // Calcular ingresos totales
    const orders = await this.orderRepository.find({
      where: { status: OrderStatus.COMPLETED },
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
      onHoldOrders,
      pendingOrders,
      completedOrders,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      todayOrders,
      monthOrders,
      ordersByStatus: {
        onHold: onHoldOrders,
        pending: pendingOrders,
        completed: completedOrders,
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
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .getMany();

    // Obtener órdenes confirmadas del mes anterior
    const prevMonthOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :start', { start: startOfPrevMonth })
      .andWhere('order.createdAt <= :end', { end: endOfPrevMonth })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
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
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
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
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
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
   * Registra el order_key del sistema externo y avanza el estado on-hold → pending
   */
  async acknowledgeOrder(id: number, orderKey: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    if (order.status !== OrderStatus.ON_HOLD) {
      throw new BadRequestException(
        `Only on-hold orders can be acknowledged. Current status: ${order.status}`,
      );
    }

    order.orderKey = orderKey;
    order.status = OrderStatus.PENDING;

    return this.orderRepository.save(order);
  }

  /**
   * Factura la orden (pending → completed) con el key de la factura OrbisNet
   */
  async completeOrder(
    id: number,
    orderKey: string,
    dateCompleted: Date,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Only pending orders can be completed. Current status: ${order.status}`,
      );
    }

    order.orderKey = orderKey;
    order.status = OrderStatus.COMPLETED;
    order.dateCompleted = dateCompleted;

    const completedOrder = await this.orderRepository.save(order);
    const fullOrder = await this.findOneByUuid(completedOrder.uuid);
    await this.emailService.sendPaymentConfirmed(fullOrder);
    return completedOrder;
  }

  /**
   * Anula una orden pendiente (pending → cancelled) restaurando el inventario
   */
  async cancelPendingOrder(id: number, dateCompleted: Date): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    if (
      order.status !== OrderStatus.PENDING &&
      order.status !== OrderStatus.ON_HOLD
    ) {
      throw new BadRequestException(
        `Order cannot be cancelled. Current status: ${order.status}`,
      );
    }

    for (const item of order.items) {
      await this.productRepository.increment(
        { id: item.productId },
        'inventory',
        item.quantity,
      );
    }

    order.status = OrderStatus.CANCELLED;
    order.dateCompleted = dateCompleted;

    const cancelledOrder = await this.orderRepository.save(order);
    const fullOrder = await this.findOneByUuid(cancelledOrder.uuid);
    await this.emailService.sendOrderCanceled(fullOrder);
    await this.emailService.sendAdminOrderCancelled(fullOrder);
    return cancelledOrder;
  }

  /**
   * Retorna órdenes en estado on-hold con el formato de integración externa
   */
  async getPendingOrders(
    page: number = 1,
    perPage: number = 10,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    perPage: number;
    lastPage: number;
  }> {
    const [orders, total] = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'itemCheck')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.shippingAddress', 'shippingAddress')
      .leftJoinAndSelect('order.paymentInfo', 'paymentInfo')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.guestCustomer', 'guestCustomer')
      .where('order.status = :status', { status: OrderStatus.ON_HOLD })
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    const deliveryMethodTitles = {
      [DeliveryMethod.PICKUP]: 'Entrega y/o recogida en el local',
      [DeliveryMethod.DELIVERY]: 'Envío a domicilio',
    };

    const data = await Promise.all(
      orders.map(async (order) => {
        let firstName: string | null = null;
        let lastName: string | null = null;
        let email: string | null = null;
        let identificationType: string | null = null;
        let identificationNumber: string | null = null;

        if (order.user) {
          firstName = order.user.firstName;
          lastName = order.user.lastName;
          email = order.user.email;
          identificationType = order.user.identificationType ?? null;
          identificationNumber = order.user.identificationNumber ?? null;
        } else if (order.guestCustomer) {
          firstName = order.guestCustomer.firstName;
          lastName = order.guestCustomer.lastName;
          email = order.guestCustomer.email;
          identificationType = order.guestCustomer.identificationType ?? null;
          identificationNumber =
            order.guestCustomer.identificationNumber ?? null;
        } else if (order.guestEmail) {
          email = order.guestEmail;
        }

        const addr = order.shippingAddress;

        // shippingAddress takes priority over user/guest profile
        if (addr?.identificationType && addr?.identificationNumber) {
          identificationType = addr.identificationType;
          identificationNumber = addr.identificationNumber;
        }

        const identification =
          identificationType && identificationNumber
            ? `${identificationType}-${identificationNumber}`
            : null;

        return {
          id: order.id,
          status: order.status,
          date_created: order.createdAt.toISOString().slice(0, 19),
          total: Number(order.total).toFixed(2),
          total_tax: Number(order.tax).toFixed(2),
          billing: {
            first_name: firstName,
            last_name: lastName,
            company: null,
            address_1: addr?.address ?? null,
            identification,
            city: addr?.city ?? null,
            email,
            phone: addr?.phone ?? null,
          },
          payment_method_title: deliveryMethodTitles[order.deliveryMethod],
          customer_note: order.notes,
          number: String(order.id),
          line_items: order.items.map((item) => {
            const ivaType = item.product?.ivaType ?? 0;
            const ivaRate = IVA_RATES[ivaType];
            const subtotal = Number(item.subtotal);
            const itemTax = (subtotal * ivaRate) / (1 + ivaRate);
            return {
              id: item.id,
              name: item.productName,
              product_id: item.product?.id ?? 0,
              quantity: item.quantity,
              tax_class: ivaType,
              tax_rate: ivaRate * 100,
              total: subtotal.toFixed(2),
              total_tax: itemTax.toFixed(2),
              sku: item.productSku ?? null,
              price: Number(item.price),
            };
          }),
        };
      }),
    );

    return {
      data,
      total,
      page,
      perPage,
      lastPage: Math.ceil(total / perPage) || 1,
    };
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

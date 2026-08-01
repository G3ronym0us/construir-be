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
import { PaymentInfo, PaymentMethod, PaymentStatus } from './payment-info.entity';
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
import { UsersService } from '../users/users.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { OrderPricingService } from './order-pricing.service';
import { QuoteOrderDto } from './dto/quote-order.dto';
import {
  OrderTrackingDto,
  toOrderTrackingDto,
} from './dto/order-tracking.dto';
import { round2 } from '../products/iva.util';
import * as bcrypt from 'bcrypt';

export type QuoteIssue =
  | { code: 'NOT_FOUND' }
  | { code: 'NOT_PUBLISHED' }
  | { code: 'INSUFFICIENT_INVENTORY'; available: number };

export interface QuoteItem {
  productUuid: string | null;
  /**
   * UUID del renglón de carrito cuando el producto ya no puede resolverse
   * (borrado con soft-delete después de agregarse al carrito): sin él no
   * hay `productUuid` que devolver, pero el frontend igual necesita algo
   * para identificar qué línea de SU carrito está fallando y ofrecer
   * quitarla. `null` para ítems resueltos normalmente.
   */
  cartItemUuid: string | null;
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

/**
 * Fila del listado de órdenes del panel.
 *
 * La orden completa trae items, dirección y relaciones que la tabla no pinta;
 * esto es lo que el listado sí muestra, ya resuelto en el backend para que el
 * panel no tenga que reunir al comprador desde tres sitios distintos en cada
 * fila.
 */
export interface AdminOrderRow {
  uuid: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: Date;
  deliveryMethod: DeliveryMethod;
  totalItems: number;
  total: number;
  totalVes: number | null;
  exchangeRate: number | null;
  paymentStatus: PaymentStatus | null;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  hasReceipt: boolean;
  customerName: string | null;
  customerIdentification: string | null;
  customerEmail: string | null;
  isGuest: boolean;
}

/** Cabecera del listado de órdenes: KPIs y conteos de los chips por estado. */
export interface AdminOrderStats {
  totalOrders: number;
  todayOrders: number;
  monthOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  /** Órdenes con el pago aún sin verificar: el trabajo pendiente del panel. */
  paymentReviewCount: number;
  oldestPaymentReviewAt: string | null;
  verifiedOrders: number;
  verifiedRevenue: number;
  verifiedRevenueVes: number | null;
  averageTicket: number;
  averageTicketVes: number | null;
  /** Tasa BCV vigente hoy, no la fijada en ninguna orden. */
  exchangeRate: number | null;
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
    private readonly usersService: UsersService,
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
   * Resuelve de dónde salen los ítems de un pedido — la MISMA regla para
   * `quoteOrder` y `createOrder`.
   *
   * Un usuario autenticado siempre se cotiza y se factura con el contenido
   * de su carrito en el servidor; cualquier `items` que venga en el body se
   * ignora. Un invitado no tiene carrito en el servidor, así que usa los
   * `items` del body.
   *
   * Antes de este arreglo cada método aplicaba esta regla por su cuenta:
   * `createOrder` la tenía, `quoteOrder` no (leía sólo `dto.items`, incluso
   * para un usuario logueado). Un cliente autenticado podía cotizar con un
   * `items` armado a mano y recibir un total; al confirmar, `createOrder`
   * facturaba el contenido real de su carrito — un número distinto, con
   * 201 y sin ningún guard que lo detectara.
   *
   * Separa los ítems del carrito en resolubles y "missing": `Product` tiene
   * `@DeleteDateColumn`, así que si un admin borra (soft-delete) un producto
   * que está en el carrito de un cliente, TypeORM excluye esa fila del join
   * y `item.product` llega en `null`. Devolver esos renglones aparte, en vez
   * de leer `item.product.uuid` sin guarda, es lo que evita el 500: cada
   * llamador decide qué hacer con ellos (ver `quoteOrder` y `createOrder`).
   *
   * Los renglones salen de acá ya sumados por producto: ver
   * `agruparPorProducto`.
   */
  /**
   * Suma en un solo renglón las cantidades del mismo producto.
   *
   * La validación de inventario recorre los renglones de a uno y compara cada
   * cantidad contra el MISMO `product.inventory`, sin acumular lo ya
   * comprometido por los renglones anteriores. Un carrito con dos renglones
   * del mismo producto —2 y 3 unidades, sobre un inventario de 4— pasaba dos
   * veces la comprobación («2 ≤ 4» y «3 ≤ 4») y terminaba vendiendo 5 de 4,
   * dejando el inventario en −1. Basta una sola petición: no hace falta
   * concurrencia para provocarlo.
   *
   * Agrupar acá arregla los dos caminos de una vez, porque `quoteOrder` y
   * `createOrder` resuelven sus ítems por esta misma función. El carrito del
   * servidor también puede traer el producto repetido en dos filas.
   *
   * Se conserva el orden de aparición para no alterar cómo se listan los
   * renglones en la cotización.
   */
  private static agruparPorProducto(
    items: Array<{ productUuid: string; quantity: number }>,
  ): Array<{ productUuid: string; quantity: number }> {
    const porProducto = new Map<
      string,
      { productUuid: string; quantity: number }
    >();

    for (const item of items) {
      const acumulado = porProducto.get(item.productUuid);
      if (acumulado) {
        acumulado.quantity += item.quantity;
      } else {
        porProducto.set(item.productUuid, { ...item });
      }
    }

    return [...porProducto.values()];
  }

  /**
   * Descuenta el inventario comprobando y restando en una sola instrucción.
   *
   * El `WHERE ... AND inventory >= :cantidad` es lo que cierra la ventana:
   * Postgres evalúa la condición y aplica la resta de forma atómica sobre la
   * fila, así que de dos checkouts simultáneos del mismo producto sólo uno
   * puede llevarse las últimas unidades. El otro recibe `affected = 0` y se
   * entera de que no alcanzó.
   *
   * Se prefirió esto a `SELECT ... FOR UPDATE` porque un carrito toca varios
   * productos y los candados habría que tomarlos siempre en el mismo orden
   * para no trabar dos pedidos entre sí. Acá no hay candados que ordenar.
   *
   * Si un producto falla a mitad de camino se devuelve lo ya reservado antes
   * de lanzar: el pedido no va a existir, así que esas unidades tienen que
   * volver al stock.
   */
  private async reservarInventario(
    items: Array<{ product: Product; quantity: number }>,
  ): Promise<void> {
    const reservados: Array<{ product: Product; quantity: number }> = [];

    for (const item of items) {
      const resultado = await this.productRepository
        .createQueryBuilder()
        .update(Product)
        .set({ inventory: () => 'inventory - :cantidad' })
        .where('uuid = :uuid AND inventory >= :cantidad', {
          uuid: item.product.uuid,
          cantidad: item.quantity,
        })
        .setParameter('cantidad', item.quantity)
        .execute();

      if (resultado.affected === 0) {
        await this.devolverInventario(reservados);

        // Se relee para informar lo que queda de verdad: `item.product` trae
        // el inventario de hace unos milisegundos, justamente el que dejó de
        // ser cierto.
        const actual = await this.productRepository.findOne({
          where: { uuid: item.product.uuid },
        });

        throw new ConflictException(
          `Insufficient inventory for ${item.product.name}. Available: ${
            actual?.inventory ?? 0
          }`,
        );
      }

      reservados.push(item);
    }
  }

  /** Devuelve al stock una reserva que ningún pedido llegó a respaldar. */
  private async devolverInventario(
    items: Array<{ product: Product; quantity: number }>,
  ): Promise<void> {
    for (const item of items) {
      await this.productRepository.increment(
        { uuid: item.product.uuid },
        'inventory',
        item.quantity,
      );
    }
  }

  private async resolveOrderItems(
    userId: number | null,
    items?: Array<{ productUuid: string; quantity: number }>,
  ): Promise<{
    items: Array<{ productUuid: string; quantity: number }>;
    missingItems: Array<{ cartItemUuid: string; quantity: number }>;
  }> {
    if (userId) {
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

      const resolved: Array<{ productUuid: string; quantity: number }> = [];
      const missingItems: Array<{ cartItemUuid: string; quantity: number }> =
        [];

      for (const item of cart.items) {
        if (!item.product) {
          missingItems.push({
            cartItemUuid: item.uuid,
            quantity: item.quantity,
          });
          continue;
        }
        resolved.push({
          productUuid: item.product.uuid,
          quantity: item.quantity,
        });
      }

      return {
        items: OrdersService.agruparPorProducto(resolved),
        missingItems,
      };
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Cart items are required for guest orders');
    }

    return {
      items: OrdersService.agruparPorProducto(
        items.map((item) => ({
          productUuid: item.productUuid,
          quantity: item.quantity,
        })),
      ),
      missingItems: [],
    };
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
  async quoteOrder(
    quoteOrderDto: QuoteOrderDto,
    userId?: number | null,
  ): Promise<OrderQuote> {
    // Misma regla de resolución que `createOrder`: un usuario autenticado se
    // cotiza (y se factura) con SU carrito del servidor, ignorando cualquier
    // `items` que venga en el body; un invitado usa los `items` del body. Dos
    // reglas distintas para la misma decisión era exactamente el bug que esta
    // rama vino a arreglar: el cliente veía un total en el quote y otro,
    // mayor, al confirmar. Un carrito vacío se rechaza con la MISMA
    // excepción que `createOrder` (no un quote vacío con `canCheckout:
    // false`): el frontend no tiene nada que previsualizar, así que dejar
    // pasar la request sólo pospone el mismo rechazo al POST /orders.
    const { items: orderItems, missingItems } = await this.resolveOrderItems(
      userId ?? null,
      quoteOrderDto.items,
    );

    // Anotamos el tipo de retorno explícitamente: sin esto, TypeScript infiere
    // una unión discriminada por rama (product: null sólo en NOT_FOUND) y
    // termina angostando `issue` en el filtro de abajo al punto de marcar la
    // comparación con 'NOT_FOUND' como imposible, aunque la lógica es correcta.
    const resolved = await Promise.all(
      orderItems.map(
        async (
          item,
        ): Promise<{
          item: { productUuid: string; quantity: number };
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
        cartItemUuid: null,
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

    // Renglones de carrito cuyo producto ya no existe (soft-delete): no hay
    // `productUuid` que resolver, así que se agregan aparte, con
    // `issue: NOT_FOUND` como cualquier otro producto no encontrado. El
    // resto del pedido se sigue cotizando con normalidad — es exactamente el
    // "nunca fallar duro" que este endpoint promete: un carrito con un ítem
    // borrado no tumba el checkout entero.
    const missingQuoteItems: QuoteItem[] = missingItems.map((missing) => ({
      productUuid: null,
      cartItemUuid: missing.cartItemUuid,
      name: null,
      sku: null,
      quantity: missing.quantity,
      ivaType: null,
      ivaRate: null,
      unitPrice: null,
      lineTotal: null,
      discount: null,
      base: null,
      iva: null,
      total: null,
      unitPriceVes: null,
      totalVes: null,
      issue: { code: 'NOT_FOUND' },
    }));

    const allItems = [...items, ...missingQuoteItems];

    return {
      exchangeRate: pricing.exchangeRate,
      rateDate: pricing.rateDate,
      items: allItems,
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
      canCheckout: allItems.every((item) => item.issue === null),
    };
  }

  /**
   * Crea una nueva orden desde el carrito del usuario (backend) o items guest
   */
  async createOrder(
    createOrderDto: CreateOrderDto,
    userId?: number | null,
  ): Promise<Order> {
    // 1. Determinar el origen de los items (compartido con quoteOrder: ver
    //    `resolveOrderItems`).
    const { items: orderItems, missingItems } = await this.resolveOrderItems(
      userId ?? null,
      createOrderDto.items,
    );

    // A diferencia de `quoteOrder`, acá no corresponde "seguir de largo":
    // facturar una orden que omite en silencio un producto borrado del
    // carrito del cliente cobraría menos de lo que él espera pagar, sin
    // avisarle por qué. Se rechaza con 400 (antes: 500, por el mismo
    // `item.product.uuid` sin guarda que se arregló en `resolveOrderItems`).
    if (missingItems.length > 0) {
      throw new BadRequestException(
        'Uno o más productos de tu carrito ya no están disponibles. Actualizá tu carrito e intentá de nuevo.',
      );
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

    // 3.2 Si el invitado pide crear cuenta, comprobar acá que el correo esté
    //     libre — antes de cualquier escritura, por el mismo motivo que la
    //     validación de la tasa. El alta ocurre al final, después de guardar
    //     el pedido, crear los renglones y descontar inventario: con un correo
    //     ya registrado reventaba ahí, dejando el pedido creado y el stock
    //     descontado mientras el cliente veía un error y no recibía ninguna
    //     confirmación del pedido que sí se había hecho.
    if (
      !userId &&
      createOrderDto.createAccount &&
      createOrderDto.customerInfo
    ) {
      const cuentaExistente = await this.usersService.findByEmail(
        createOrderDto.customerInfo.email,
      );

      if (cuentaExistente) {
        throw new ConflictException(
          'Ya existe una cuenta con ese correo. Iniciá sesión, o desmarcá la opción de crear cuenta para seguir como invitado.',
        );
      }
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
    //
    // Si el cliente mandó `expectedExchangeRate` y hoy no hay NINGUNA tasa
    // disponible (`resolveRate()` traga el error y devuelve null), antes se
    // seguía de largo: la orden quedaba en 201 con los campos VES en NULL,
    // pero el cliente esperaba pagar en bolívares un monto que el backend
    // nunca llegó a registrar. Se rechaza explícitamente con el mismo código
    // que el caso de tasa rotada, en vez de facturar silenciosamente sólo en
    // USD.
    if (createOrderDto.expectedExchangeRate !== undefined) {
      if (pricing.exchangeRate === null) {
        throw new ConflictException({
          message:
            'La tasa de cambio no está disponible en este momento. Intentá de nuevo en unos minutos.',
          code: 'EXCHANGE_RATE_CHANGED',
          exchangeRate: null,
          rateDate: null,
          totals: {
            subtotal: pricing.subtotal,
            tax: pricing.tax,
            total: pricing.total,
            subtotalVes: null,
            taxVes: null,
            totalVes: null,
          },
        });
      }

      if (
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
    }

    // 3.9 Reservar el inventario ANTES de cualquier otra escritura.
    //
    // La comprobación del paso 2 lee `product.inventory` y no vuelve a
    // mirarlo: entre esa lectura y el descuento pasaban ~200 líneas sin
    // candado, así que dos checkouts simultáneos del mismo producto veían
    // ambos "hay 4, alcanza" y ambos seguían. Cuatro pedidos concurrentes de
    // 4 unidades sobre un stock de 4 se aceptaban los cuatro y dejaban el
    // inventario en −12 (reproducido).
    //
    // `reservarInventario` comprueba y descuenta en una sola instrucción, así
    // que el que llega segundo no encuentra existencias y se rechaza limpio.
    // Va acá, como PRIMERA escritura y después de todas las validaciones, para
    // que un rechazo no deje ninguna fila huérfana detrás.
    await this.reservarInventario(validatedItems);

    // A partir de acá el inventario ya está comprometido. Si algo falla antes
    // de que la orden y sus renglones queden guardados, hay que devolverlo:
    // ver el `finally` del cierre.
    let reservaConfirmada = false;

    try {
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

      // 5.b Completar la cuenta del cliente autenticado con lo que acaba de
      //     escribir.
      //
      //     El checkout sólo le pide cédula y teléfono a quien tiene sesión
      //     cuando su cuenta no los tiene, así que recibir `customerInfo` con
      //     `userId` significa exactamente eso: faltaban. Sin guardarlos, se los
      //     volvería a pedir en cada pedido y el ERP los seguiría recibiendo
      //     vacíos.
      //
      //     Sólo se rellena lo que falta: el checkout no puede pisar en silencio
      //     un dato que el cliente ya tenía cargado en su cuenta.
      if (userId && createOrderDto.customerInfo) {
        const cuenta = await this.userRepository.findOne({
          where: { id: userId },
        });

        if (cuenta) {
          const faltantes: Partial<User> = {};

          if (
            !cuenta.identificationNumber &&
            createOrderDto.customerInfo.identificationNumber
          ) {
            faltantes.identificationType =
              createOrderDto.customerInfo.identificationType;
            faltantes.identificationNumber =
              createOrderDto.customerInfo.identificationNumber;
          }

          if (!cuenta.phone && createOrderDto.customerInfo.phone) {
            faltantes.phone = createOrderDto.customerInfo.phone;
          }

          if (Object.keys(faltantes).length > 0) {
            await this.userRepository.update(userId, faltantes);
          }
        }
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
          // El desglose que ya calculó `price()`, congelado acá para que el
          // contrato del ERP no dependa del `ivaType` vivo del producto.
          base: line.base,
          iva: line.iva,
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

      // 7. El inventario ya se descontó en el paso 3.9, antes de escribir
      //    nada. Acá sólo se confirma: la orden y sus renglones ya están
      //    guardados, así que la reserva pasa a respaldar un pedido real y el
      //    `finally` no debe devolverla.
      reservaConfirmada = true;

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
        // El alta se delega en `UsersService.create()`, la misma que usa el
        // registro normal. Armarlo a mano acá lo dejaba a medias: sin cédula ni
        // teléfono, y —lo peor— sin el correo de verificación. Como el login
        // exige `emailVerified` para el rol `user`, cada cuenta creada desde el
        // checkout nacía sin poder iniciar sesión nunca: justo lo que el cliente
        // marcó la casilla para conseguir.
        const savedUser = await this.usersService.create({
          firstName: createOrderDto.customerInfo.firstName,
          lastName: createOrderDto.customerInfo.lastName,
          email: createOrderDto.customerInfo.email,
          phone: createOrderDto.customerInfo.phone,
          identificationType: createOrderDto.customerInfo.identificationType,
          identificationNumber: createOrderDto.customerInfo.identificationNumber,
          password: createOrderDto.password,
        });

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
    } finally {
      // Si se cayó antes de que la orden y sus renglones quedaran guardados,
      // el inventario reservado no lo respalda ningún pedido: se devuelve.
      // Después de esa marca ya no, porque las escrituras que siguen (vaciar
      // el carrito, crear la cuenta, contar el cupón, enviar los correos) no
      // invalidan un pedido que sí existe.
      if (!reservaConfirmada) {
        await this.devolverInventario(validatedItems);
      }
    }
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
   * Busca una orden por id numérico o por uuid, para el ERP.
   *
   * Todo el resto del contrato del ERP direcciona las órdenes por su id
   * numérico (`PUT /orders/:id`, y el `number` que emitimos es el id), así que
   * el integrador lo intenta también acá — y lo hizo: quedaron dos 500 en
   * `api_request_logs` de un `GET /api/v1/orders/13`. Postgres falla al castear
   * '13' a uuid y el error sube como 500.
   *
   * La guarda de forma es la que evita repetirlo: sin ella, un identificador
   * que no sea ni número ni uuid llega igual a la consulta y vuelve a reventar.
   */
  async findOneForErp(identifier: string): Promise<Order> {
    const isNumericId = /^\d+$/.test(identifier);
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );

    if (!isNumericId && !isUuid) {
      throw new NotFoundException(`Order ${identifier} not found`);
    }

    const order = await this.orderRepository.findOne({
      where: isNumericId ? { id: Number(identifier) } : { uuid: identifier },
    });

    if (!order) {
      throw new NotFoundException(`Order ${identifier} not found`);
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
   * Seguimiento público de un pedido a partir de su número.
   *
   * Devuelve un DTO, nunca la entidad: quien tenga el número de orden no está
   * autenticado como nadie, así que sólo puede ver el avance del pedido. Ver
   * `OrderTrackingDto` para qué queda afuera y por qué.
   */
  async trackByOrderNumber(orderNumber: string): Promise<OrderTrackingDto> {
    const order = await this.findByOrderNumber(orderNumber);
    return toOrderTrackingDto(order);
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
  async getAdminStats(): Promise<AdminOrderStats> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(
      startOfToday.getFullYear(),
      startOfToday.getMonth(),
      1,
    );

    // Un solo group by en vez de un count por estado: los chips del listado
    // necesitan los cuatro conteos y el total sale de sumarlos.
    const statusRows = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany<{ status: OrderStatus; count: string }>();

    const ordersByStatus = Object.values(OrderStatus).reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<OrderStatus, number>,
    );
    for (const row of statusRows) {
      ordersByStatus[row.status] = Number(row.count);
    }

    const totalOrders = Object.values(ordersByStatus).reduce(
      (sum, count) => sum + count,
      0,
    );

    // Los ingresos son los de los pagos verificados, no los de las órdenes
    // completadas: el panel cobra por adelantado y lo que interesa aquí es el
    // dinero ya confirmado, así que las canceladas no cuentan como ingreso.
    //
    // El conteo de pagos por revisar, en cambio, NO las excluye: es el número
    // que lleva el chip del listado y tiene que cuadrar con las filas que ese
    // mismo chip muestra al pulsarlo (`?paymentStatus=pending`), que sí las
    // trae. Un pago sin verificar de una orden cancelada también da trabajo.
    const [todayOrders, monthOrders, pendingPayment, verifiedOrdersList, currentRate] =
      await Promise.all([
        this.orderRepository
          .createQueryBuilder('order')
          .where('order.createdAt >= :startOfToday', { startOfToday })
          .getCount(),
        this.orderRepository
          .createQueryBuilder('order')
          .where('order.createdAt >= :startOfMonth', { startOfMonth })
          .getCount(),
        this.ordersByPaymentStatus(PaymentStatus.PENDING),
        this.ordersByPaymentStatus(PaymentStatus.VERIFIED, {
          excludeCancelled: true,
        }),
        this.exchangeRatesService.findLatest(),
      ]);

    const verifiedOrders = verifiedOrdersList.length;
    const verifiedRevenue = round2(
      verifiedOrdersList.reduce((sum, order) => sum + Number(order.total), 0),
    );
    // `totalVes` es nulo en las órdenes anteriores a la tasa fijada; si ninguna
    // la tiene no hay monto en Bs. que mostrar y la tarjeta cae al USD.
    const withVes = verifiedOrdersList.filter((order) => order.totalVes !== null);
    const verifiedRevenueVes = withVes.length
      ? round2(withVes.reduce((sum, order) => sum + Number(order.totalVes), 0))
      : null;

    return {
      totalOrders,
      todayOrders,
      monthOrders,
      ordersByStatus,
      paymentReviewCount: pendingPayment.length,
      oldestPaymentReviewAt: pendingPayment.length
        ? new Date(
            Math.min(
              ...pendingPayment.map((order) => order.createdAt.getTime()),
            ),
          ).toISOString()
        : null,
      verifiedOrders,
      verifiedRevenue,
      verifiedRevenueVes,
      averageTicket: verifiedOrders ? round2(verifiedRevenue / verifiedOrders) : 0,
      averageTicketVes:
        verifiedRevenueVes !== null
          ? round2(verifiedRevenueVes / withVes.length)
          : null,
      exchangeRate: currentRate ? Number(currentRate.rate) : null,
    };
  }

  /** Órdenes con el pago en un estado dado, para los KPIs del listado. */
  private ordersByPaymentStatus(
    status: PaymentStatus,
    { excludeCancelled = false } = {},
  ): Promise<Order[]> {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.paymentInfo', 'paymentInfo')
      .where('paymentInfo.status = :status', { status });

    if (excludeCancelled) {
      query.andWhere('order.status != :cancelled', {
        cancelled: OrderStatus.CANCELLED,
      });
    }

    return query.getMany();
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
    // Las relaciones se cargan siempre: el listado del panel pinta al cliente y
    // el estado del pago en cada fila, y el CSV los exporta. Con QueryBuilder no
    // valen las relaciones `eager` de la entidad, hay que unirlas a mano.
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('order.paymentInfo', 'paymentInfo')
      .leftJoinAndSelect('order.guestCustomer', 'guestCustomer')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.shippingAddress', 'shippingAddress');

    if (filters.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters.paymentStatus) {
      query.andWhere('paymentInfo.status = :paymentStatus', {
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
      // El buscador del panel es uno solo para número de orden, nombre,
      // cédula/RIF y referencia de pago.
      const conditions = [
        'order.orderNumber ILIKE :search',
        'order.guestEmail ILIKE :search',
        'guestCustomer.email ILIKE :search',
        "CONCAT(guestCustomer.firstName, ' ', guestCustomer.lastName) ILIKE :search",
        'user.email ILIKE :search',
        "CONCAT(user.firstName, ' ', user.lastName) ILIKE :search",
        "CONCAT(shippingAddress.firstName, ' ', shippingAddress.lastName) ILIKE :search",
        'paymentInfo.referenceCode ILIKE :search',
        'paymentInfo.referenceNumber ILIKE :search',
      ];
      const params: Record<string, string> = { search: `%${filters.search}%` };

      // La cédula la teclea el admin como la lee ("V-18.402.117") pero en la
      // base está cruda y sin normalizar, así que se comparan solo los dígitos
      // de ambos lados. Con menos de cuatro no se busca por identificación: no
      // distinguiría a nadie y ensuciaría el resto de coincidencias.
      const digits = filters.search.replace(/\D/g, '');
      if (digits.length >= 4) {
        const identificationColumns = [
          'guestCustomer.identificationNumber',
          'user.identificationNumber',
          'shippingAddress.identificationNumber',
        ];
        conditions.push(
          ...identificationColumns.map(
            (column) =>
              `REPLACE(REPLACE(${column}, '.', ''), '-', '') ILIKE :identification`,
          ),
        );
        params.identification = `%${digits}%`;
      }

      query.andWhere(`(${conditions.join(' OR ')})`, params);
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
   * Listado de órdenes del panel: las mismas órdenes filtradas, resumidas a lo
   * que la tabla pinta.
   */
  async getAdminOrders(filters: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: AdminOrderRow[]; total: number }> {
    const { orders, total } = await this.filterOrders(filters);

    return { orders: orders.map((order) => this.toAdminOrderRow(order)), total };
  }

  /**
   * Resume una orden para el listado del panel.
   *
   * Al comprador se le busca en las tres fuentes que puede tener una orden —
   * invitado, usuario registrado y dirección de envío, la única con datos en las
   * órdenes anteriores a `guest_customers` — y se completa hueco por hueco.
   */
  private toAdminOrderRow(order: Order): AdminOrderRow {
    const guest = order.guestCustomer;
    const user = order.user;
    const address = order.shippingAddress;

    const fullName = (first?: string | null, last?: string | null) =>
      `${first ?? ''} ${last ?? ''}`.trim() || null;

    const identification = (
      type?: string | null,
      number?: string | null,
    ): string | null => (number ? `${type ?? ''}-${number}`.replace(/^-/, '') : null);

    return {
      uuid: order.uuid,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      deliveryMethod: order.deliveryMethod,
      totalItems: order.totalItems,
      total: Number(order.total),
      totalVes: order.totalVes === null ? null : Number(order.totalVes),
      exchangeRate:
        order.exchangeRate === null ? null : Number(order.exchangeRate),
      paymentStatus: order.paymentInfo?.status ?? null,
      paymentMethod: order.paymentInfo?.method ?? null,
      paymentReference:
        order.paymentInfo?.referenceCode ??
        order.paymentInfo?.referenceNumber ??
        null,
      hasReceipt: Boolean(order.paymentInfo?.receiptUrl),
      customerName:
        fullName(guest?.firstName, guest?.lastName) ??
        fullName(user?.firstName, user?.lastName) ??
        fullName(address?.firstName, address?.lastName),
      customerIdentification:
        identification(guest?.identificationType, guest?.identificationNumber) ??
        identification(user?.identificationType, user?.identificationNumber) ??
        identification(
          address?.identificationType,
          address?.identificationNumber,
        ),
      customerEmail:
        guest?.email ?? user?.email ?? address?.email ?? order.guestEmail ?? null,
      isGuest: !order.userId,
    };
  }

  /**
   * Registra el order_key del sistema externo y avanza el estado on-hold → pending
   */
  /**
   * Acusa recibo de la orden desde el ERP (on-hold → pending) y registra su O/C.
   *
   * Es idempotente a propósito: si el ERP escribe bien pero pierde la respuesta
   * por timeout, va a reintentar — es lo correcto de su lado — y un 400 en ese
   * reintento es indistinguible de un fallo real. O marca la orden como fallida
   * y la deja fuera de sincronía, o reintenta en un bucle que nunca va a
   * funcionar. Repetir el mismo `order_key` devuelve la orden tal como quedó.
   *
   * Lo que sí sigue siendo un error es acusar recibo con una O/C **distinta**
   * de la ya registrada: eso no es un reintento, son dos órdenes de compra
   * peleando por el mismo pedido, y hay que resolverlo a mano.
   */
  async acknowledgeOrder(id: number, orderKey: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    if (order.status !== OrderStatus.ON_HOLD) {
      // El atajo idempotente sólo aplica mientras la orden sigue viva en el
      // flujo (pending: ya se acusó; completed: ya se facturó). Una orden
      // `cancelled` con la misma O/C no es un reintento exitoso — es el
      // acuse tardío de algo que ya se anuló — y debe seguir fallando con
      // 400 para que el ERP no la dé por sincronizada.
      const stillAlive =
        order.status === OrderStatus.PENDING ||
        order.status === OrderStatus.COMPLETED;

      if (stillAlive && order.purchaseOrderKey === orderKey) {
        return order;
      }

      throw new BadRequestException(
        `Only on-hold orders can be acknowledged. Current status: ${order.status}`,
      );
    }

    order.orderKey = orderKey;
    order.purchaseOrderKey = orderKey;
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
      // Reintento de una facturación ya aplicada: se devuelve la orden como
      // quedó, sin volver a escribir ni a mandar el correo de pago confirmado.
      // Ver el comentario de `acknowledgeOrder` para el porqué.
      if (
        order.status === OrderStatus.COMPLETED &&
        order.orderKey === orderKey
      ) {
        return order;
      }

      throw new BadRequestException(
        `Only pending orders can be completed. Current status: ${order.status}`,
      );
    }

    // Pisa `orderKey` con el número de factura, a propósito: `purchaseOrderKey`
    // ya conserva la O/C que registró el acknowledge.
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
      // Reintento de una anulación ya aplicada. La salida temprana es
      // obligatoria, no una comodidad: seguir de largo devolvería el
      // inventario una segunda vez por cada renglón, inflando el stock de
      // productos que nunca volvieron al depósito.
      if (order.status === OrderStatus.CANCELLED) {
        return order;
      }

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
   * Órdenes en espera de que el ERP las tome.
   *
   * Devuelve entidades: traducirlas al contrato de WooCommerce es tarea del
   * controlador v1, vía `toWooOrder`. Tenerlo acá haría que el dominio
   * dependiera de la forma que espera un consumidor externo.
   */
  async getPendingOrders(
    page: number = 1,
    perPage: number = 10,
  ): Promise<{
    data: Order[];
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

    return {
      data: orders,
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

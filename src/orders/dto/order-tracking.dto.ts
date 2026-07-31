import { Order, OrderStatus, DeliveryMethod } from '../order.entity';
import { PaymentMethod, PaymentStatus } from '../payment-info.entity';

/**
 * Lo que ve quien consulta `GET /orders/track/:orderNumber`.
 *
 * Ese endpoint es público a propósito — un invitado no tiene sesión con la que
 * autenticarse — así que su respuesta no puede ser la entidad `Order`. Casi
 * todas las relaciones de `Order` son `eager`, de modo que devolverla cruda
 * entregaba, a cambio de sólo el número de orden: la cédula, el teléfono y el
 * domicilio del cliente; los datos del pago con su número de referencia y el
 * enlace al comprobante en S3; las notas internas del panel; y la referencia
 * del ERP.
 *
 * Acá va únicamente lo que hace falta para responder "¿en qué va mi pedido?":
 * estado, fechas, montos y renglones. Del pago se expone el método y su
 * estado — sirven para explicarle al cliente que su pago sigue por verificar —
 * pero ningún dato que identifique a nadie ni que sirva para suplantarlo. Por
 * la misma razón tampoco viaja `discountCode`: es un cupón funcional, no un
 * dato informativo — `discountAmount` ya le explica el descuento al cliente.
 *
 * Los montos se emiten como texto, igual que los emitía la entidad (las
 * columnas `numeric` de TypeORM llegan como string), para no cambiarle el
 * formato a quien ya consume este endpoint.
 */
export class OrderTrackingItemDto {
  uuid: string;
  productName: string;
  productSku: string | null;
  quantity: number;
  price: string | null;
  priceVes: string | null;
  subtotal: string | null;
  subtotalVes: string | null;
}

export class OrderTrackingPaymentDto {
  method: PaymentMethod;
  status: PaymentStatus;
}

export class OrderTrackingDto {
  orderNumber: string;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  createdAt: Date;
  dateCompleted: Date | null;

  subtotal: string | null;
  tax: string | null;
  shipping: string | null;
  discountAmount: string | null;
  total: string | null;

  exchangeRate: string | null;
  subtotalVes: string | null;
  taxVes: string | null;
  discountAmountVes: string | null;
  totalVes: string | null;

  paymentInfo: OrderTrackingPaymentDto | null;
  items: OrderTrackingItemDto[];
}

/** Conserva el `null` y deja el resto como texto, que es como salía antes. */
function money(value: number | string | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value);
}

export function toOrderTrackingDto(order: Order): OrderTrackingDto {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    deliveryMethod: order.deliveryMethod,
    createdAt: order.createdAt,
    dateCompleted: order.dateCompleted ?? null,

    subtotal: money(order.subtotal),
    tax: money(order.tax),
    shipping: money(order.shipping),
    discountAmount: money(order.discountAmount),
    total: money(order.total),

    exchangeRate: money(order.exchangeRate),
    subtotalVes: money(order.subtotalVes),
    taxVes: money(order.taxVes),
    discountAmountVes: money(order.discountAmountVes),
    totalVes: money(order.totalVes),

    paymentInfo: order.paymentInfo
      ? {
          method: order.paymentInfo.method,
          status: order.paymentInfo.status,
        }
      : null,

    items: (order.items ?? []).map((item) => ({
      uuid: item.uuid,
      productName: item.productName,
      productSku: item.productSku ?? null,
      quantity: item.quantity,
      price: money(item.price),
      priceVes: money(item.priceVes),
      subtotal: money(item.subtotal),
      subtotalVes: money(item.subtotalVes),
    })),
  };
}

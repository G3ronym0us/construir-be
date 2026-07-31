import { Order, DeliveryMethod } from '../../orders/order.entity';
import { OrderItem } from '../../orders/order-item.entity';
import { IVA_RATES, IvaType } from '../../products/enums/iva-type.enum';
import { round2 } from '../../products/iva.util';

/**
 * Traduce una `Order` nuestra a la forma del REST API de WooCommerce, que es
 * la que OrbisNet ya tiene implementada y no se puede mover.
 *
 * Acá viven todas las rarezas del contrato, para que no se mezclen con la
 * lógica de negocio:
 *
 * - `line_items[].total` y `.price` van **sin IVA**; el `total` de la orden sí
 *   lo incluye. Verificado contra el payload real: 98,46 × 0,16 = 15,75, que es
 *   el `total_tax` de esa línea.
 * - Los campos de `billing` son strings vacíos, nunca nulos: un cliente en
 *   Python que haga `billing['address_1'].strip()` revienta con `None`.
 * - `date_created` va en hora local del sitio, sin marcador de zona.
 * - La identificación se emite en `address_2` (donde OrbisNet parece leerla) y
 *   además en el campo propio `identification`, porque no está confirmado de
 *   cuál de los dos lee.
 */

export interface WooLineItem {
  id: number;
  name: string;
  product_id: number;
  quantity: number;
  tax_class: string;
  tax_rate: number;
  total: string;
  total_tax: string;
  sku: string | null;
  price: number;
}

export interface WooBilling {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  identification: string;
  city: string;
  email: string;
  phone: string;
}

export interface WooOrder {
  id: number;
  status: string;
  date_created: string;
  total: string;
  total_tax: string;
  billing: WooBilling;
  payment_method_title: string;
  customer_note: string;
  number: string;
  line_items: WooLineItem[];
}

const DELIVERY_METHOD_TITLES: Record<DeliveryMethod, string> = {
  [DeliveryMethod.PICKUP]: 'Entrega y/o recogida en el local',
  [DeliveryMethod.DELIVERY]: 'Envío a domicilio',
};

/** WooCommerce nunca emite null en billing; un `.strip()` del otro lado se cae. */
function text(value: string | null | undefined): string {
  return value ?? '';
}

/**
 * `YYYY-MM-DDTHH:mm:ss` en la zona de la tienda.
 *
 * El locale `sv-SE` produce `YYYY-MM-DD HH:mm:ss`, que es el formato ISO sin la
 * T; sólo hay que cambiarle el separador. Evita traer una dependencia de fechas
 * para una única conversión.
 */
export function formatLocalDate(date: Date, timeZone: string): string {
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  return formatted.replace(' ', 'T');
}

/**
 * Base e IVA de la línea.
 *
 * Las órdenes creadas desde que se persiste el desglose lo traen guardado. Las
 * anteriores tienen `base`/`iva` en NULL y hay que derivarlo de la alícuota
 * viva del producto — con la limitación conocida de que esa alícuota pudo
 * cambiar desde que se facturó. Se deriva sólo lo que falta: la convención de
 * emisión es la misma para unas y otras.
 */
function breakdown(item: OrderItem): { base: number; iva: number } {
  if (
    item.base !== null &&
    item.base !== undefined &&
    item.iva !== null &&
    item.iva !== undefined
  ) {
    return { base: Number(item.base), iva: Number(item.iva) };
  }

  const ivaType = item.product?.ivaType ?? IvaType.NORMAL;
  const rate = IVA_RATES[ivaType];
  const subtotal = Number(item.subtotal);
  const iva = round2((subtotal * rate) / (1 + rate));

  return { base: round2(subtotal - iva), iva };
}

// Alícuotas nominales conocidas, como porcentaje (0, 8, 16, 24).
const NOMINAL_TAX_RATES = Object.values(IVA_RATES).map((rate) => rate * 100);

/**
 * Tolerancia para ajustar `tax_rate` a la alícuota nominal más cercana.
 *
 * `base` e `iva` llegan cada uno ya redondeado a 2 decimales de forma
 * independiente (persistidos así, o derivados más arriba), así que su
 * cociente no reproduce la alícuota nominal salvo que la división caiga
 * exacta: 0.73 / 4.55 = 16.0439...%, no 16%. El desvío crece cuanto más chica
 * es la base, porque la misma media unidad de redondeo en cada monto pesa
 * proporcionalmente más. Un punto porcentual cubre con margen el peor caso
 * visto en el payload real de OrbisNet (orden 6284, línea de `base = 2.40`:
 * desvío de 0.167 puntos) y queda lejos de la mitad de la distancia entre
 * alícuotas conocidas (4 puntos), así que no hay riesgo de confundir un
 * cociente ruidoso con la alícuota vecina.
 */
const TAX_RATE_TOLERANCE = 1;

/**
 * `iva / base` no reproduce la alícuota nominal por el redondeo de cada
 * monto a 2 decimales (ver `TAX_RATE_TOLERANCE`); acá se ajusta el cociente
 * calculado a la alícuota conocida más cercana cuando el desvío es chico. No
 * se resuelve leyendo `IVA_RATES[item.product?.ivaType]` directo porque eso
 * rompe el caso de un producto borrado con desglose exento guardado: emitiría
 * 16 en vez de 0.
 */
function nominalTaxRate(base: number, iva: number): number {
  if (base <= 0) {
    return 0;
  }

  const computed = round2((iva / base) * 100);

  const nearest = NOMINAL_TAX_RATES.reduce((closest, rate) =>
    Math.abs(rate - computed) < Math.abs(closest - computed) ? rate : closest,
  );

  return Math.abs(nearest - computed) <= TAX_RATE_TOLERANCE
    ? nearest
    : computed;
}

function toWooLineItem(item: OrderItem): WooLineItem {
  const { base, iva } = breakdown(item);

  return {
    id: item.id,
    name: item.productName,
    product_id: item.product?.id ?? 0,
    quantity: item.quantity,
    // WooCommerce emite la clase de impuesto como string vacío; la alícuota
    // viaja en `tax_rate`, que es campo nuestro.
    tax_class: '',
    tax_rate: nominalTaxRate(base, iva),
    total: base.toFixed(2),
    total_tax: iva.toFixed(2),
    sku: item.productSku ?? null,
    // Sin redondear, igual que WooCommerce (`"price": 0.9099999999999999`):
    // redondear rompe `price × quantity === total` en cantidades que no
    // dividen exacto.
    price: base / item.quantity,
  };
}

export function toWooOrder(order: Order, timeZone: string): WooOrder {
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
    identificationNumber = order.guestCustomer.identificationNumber ?? null;
  } else if (order.guestEmail) {
    email = order.guestEmail;
  }

  const addr = order.shippingAddress;

  // La dirección de envío gana sobre el perfil: es lo que el cliente confirmó
  // en ese pedido.
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
    date_created: formatLocalDate(order.createdAt, timeZone),
    total: Number(order.total).toFixed(2),
    total_tax: Number(order.tax).toFixed(2),
    billing: {
      first_name: text(firstName),
      last_name: text(lastName),
      company: '',
      address_1: text(addr?.address),
      address_2: text(identification),
      identification: text(identification),
      city: text(addr?.city),
      email: text(email),
      // El teléfono es del cliente, no del envío: leerlo sólo de la dirección
      // dejaba sin teléfono a toda orden de pickup.
      phone: text(
        addr?.phone ?? order.guestCustomer?.phone ?? order.user?.phone,
      ),
    },
    payment_method_title: DELIVERY_METHOD_TITLES[order.deliveryMethod],
    customer_note: text(order.notes),
    number: String(order.id),
    line_items: (order.items ?? []).map(toWooLineItem),
  };
}

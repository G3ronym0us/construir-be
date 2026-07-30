import { BadRequestException, Injectable } from '@nestjs/common';
import { Product } from '../products/product.entity';
import { fromTotal, round2 } from '../products/iva.util';
import { DiscountsService } from '../discounts/discounts.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

export interface PricingInput {
  items: Array<{ product: Product; quantity: number }>;
  discountCode?: string;
}

export interface PricedLine {
  product: Product;
  quantity: number;
  /** Precio unitario con IVA incluido: el mismo que muestra el catálogo. */
  unitPrice: number;
  /** Monto de línea con IVA, antes de descuento. */
  lineTotal: number;
  /** Porción del descuento del pedido que le tocó a esta línea. */
  discount: number;
  base: number;
  iva: number;
  /** `lineTotal - discount`, y siempre exactamente `base + iva`. */
  total: number;
  /**
   * El desglose de la línea en bolívares. Se convierte por línea, y los
   * agregados del pedido salen de sumar estas líneas, para que la suma de los
   * renglones dé exactamente el total en las tres monedas de la respuesta.
   * Nulos si no hay tasa disponible.
   */
  baseVes: number | null;
  ivaVes: number | null;
  totalVes: number | null;
}

export interface OrderPricing {
  lines: PricedLine[];
  itemsTotal: number;
  discount: number;
  discountCode: string | null;
  discountId: number | null;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  exchangeRate: number | null;
  rateDate: string | null;
  subtotalVes: number | null;
  taxVes: number | null;
  discountVes: number | null;
  totalVes: number | null;
}

/**
 * Calculador único de precios de un pedido.
 *
 * Existe para que el desglose que se le muestra al cliente y el monto que se
 * le factura no puedan divergir: lo consumen tanto `quoteOrder` (que no
 * persiste nada) como `createOrder`. Antes cada uno calculaba por su cuenta y
 * el resultado era un checkout que mostraba un IVA que el backend nunca vio.
 *
 * El modelo es de precios con IVA incluido: `product.priceWithIva` es lo que
 * el cliente vio en el catálogo, y el desglose se obtiene extrayendo hacia
 * atrás. El total nunca difiere de lo que el cliente sumó en la vitrina,
 * menos su descuento.
 */
@Injectable()
export class OrderPricingService {
  // El envío todavía no se calcula (ver TODO en OrdersService.createOrder).
  // Queda expuesto en el desglose para que agregarlo después no cambie la
  // forma de la respuesta.
  private static readonly SHIPPING = 0;

  constructor(
    private readonly discountsService: DiscountsService,
    private readonly exchangeRatesService: ExchangeRatesService,
  ) {}

  async price({ items, discountCode }: PricingInput): Promise<OrderPricing> {
    const lineTotals = items.map((item) =>
      round2(Number(item.product.priceWithIva) * item.quantity),
    );
    const itemsTotal = round2(lineTotals.reduce((sum, v) => sum + v, 0));

    const { discount, discountId, resolvedCode } = await this.resolveDiscount(
      discountCode,
      itemsTotal,
    );

    const perLine = this.prorate(discount, lineTotals, itemsTotal);

    // La tasa se resuelve antes de armar las líneas porque cada línea convierte
    // sus propios montos a bolívares.
    const { exchangeRate, rateDate } = await this.resolveRate();

    const lines: PricedLine[] = items.map((item, index) => {
      const lineTotal = lineTotals[index];
      const lineDiscount = perLine[index];
      const net = round2(lineTotal - lineDiscount);
      // La extracción es por línea, con la alícuota propia de cada producto.
      // Hacerla sobre el agregado con una tasa mezclada le cobraría IVA a los
      // productos exentos.
      const { base, iva } = fromTotal(net, item.product.ivaType);

      const baseVes =
        exchangeRate !== null ? round2(base * exchangeRate) : null;
      const ivaVes = exchangeRate !== null ? round2(iva * exchangeRate) : null;

      return {
        product: item.product,
        quantity: item.quantity,
        unitPrice: round2(Number(item.product.priceWithIva)),
        lineTotal,
        discount: lineDiscount,
        base,
        iva,
        total: net,
        baseVes,
        ivaVes,
        totalVes:
          baseVes !== null && ivaVes !== null ? round2(baseVes + ivaVes) : null,
      };
    });

    const tax = round2(lines.reduce((sum, line) => sum + line.iva, 0));
    const subtotal = round2(lines.reduce((sum, line) => sum + line.base, 0));
    const shipping = OrderPricingService.SHIPPING;
    const total = round2(subtotal + tax + shipping);

    // Los agregados en bolívares salen de sumar las líneas, no de convertir los
    // agregados en USD. Así la suma de los renglones que ve el cliente da
    // exactamente el total, en USD y en bolívares.
    const subtotalVes =
      exchangeRate !== null
        ? round2(lines.reduce((sum, line) => sum + (line.baseVes ?? 0), 0))
        : null;
    const taxVes =
      exchangeRate !== null
        ? round2(lines.reduce((sum, line) => sum + (line.ivaVes ?? 0), 0))
        : null;

    return {
      lines,
      itemsTotal,
      discount,
      discountCode: resolvedCode,
      discountId,
      subtotal,
      tax,
      shipping,
      total,
      exchangeRate,
      rateDate,
      subtotalVes,
      taxVes,
      discountVes:
        exchangeRate !== null ? round2(discount * exchangeRate) : null,
      totalVes:
        subtotalVes !== null && taxVes !== null
          ? round2(subtotalVes + taxVes)
          : null,
    };
  }

  private async resolveDiscount(
    discountCode: string | undefined,
    itemsTotal: number,
  ): Promise<{
    discount: number;
    discountId: number | null;
    resolvedCode: string | null;
  }> {
    if (!discountCode) {
      return { discount: 0, discountId: null, resolvedCode: null };
    }

    const validation = await this.discountsService.validateDiscount(
      discountCode,
      itemsTotal,
    );

    if (!validation.valid) {
      throw new BadRequestException(
        validation.error || 'Invalid discount code',
      );
    }

    // El descuento se topea al monto del pedido: un cupón mayor no genera
    // saldo a favor ni un total negativo.
    const discount = round2(
      Math.min(validation.discount?.discountAmount || 0, itemsTotal),
    );
    const found = await this.discountsService.findByCode(discountCode);

    return {
      discount,
      discountId: found?.id ?? null,
      resolvedCode: found?.code ?? null,
    };
  }

  /**
   * Reparte el descuento del pedido entre las líneas, proporcional al monto de
   * cada una.
   *
   * El residuo de redondeo (la diferencia entre el descuento otorgado y la
   * suma de los shares proporcionales, que puede ser positiva o negativa) se
   * reparte por monto descendente en vez de volcarse entero en una sola
   * línea: si esa línea no tiene espacio para absorberlo sin superar su
   * propio monto (o, para un residuo negativo, sin bajar de cero), el
   * sobrante se corre a la siguiente. Sin esto, un residuo de más de un
   * céntimo — o unas cuantas líneas de monto parecido con un cupón que cubre
   * casi todo el pedido — puede dejar una porción por encima del monto de su
   * línea, y por lo tanto un renglón con neto e IVA negativos aunque los
   * agregados del pedido sigan cuadrando.
   */
  private prorate(
    discount: number,
    lineTotals: number[],
    itemsTotal: number,
  ): number[] {
    if (discount <= 0 || itemsTotal <= 0) {
      return lineTotals.map(() => 0);
    }

    const shares = lineTotals.map((lineTotal) =>
      round2((discount * lineTotal) / itemsTotal),
    );

    // Línea de mayor monto primero: ahí es donde se prefiere que caiga el
    // ajuste, y donde primero se intenta si no cabe entero.
    const order = lineTotals
      .map((_, index) => index)
      .sort((a, b) => lineTotals[b] - lineTotals[a]);

    let residual = round2(
      discount - round2(shares.reduce((sum, v) => sum + v, 0)),
    );

    for (const index of order) {
      if (residual === 0) break;

      if (residual > 0) {
        // No se le puede dar a una línea más de lo que ella misma vale.
        const room = round2(lineTotals[index] - shares[index]);
        const delta = Math.min(residual, room);
        shares[index] = round2(shares[index] + delta);
        residual = round2(residual - delta);
      } else {
        // Tampoco se le puede quitar más de lo que ya tiene asignado.
        const delta = Math.max(residual, -shares[index]);
        shares[index] = round2(shares[index] + delta);
        residual = round2(residual - delta);
      }
    }

    return shares;
  }

  /**
   * Resuelve la tasa de facturación.
   *
   * Si no hay tasa disponible devuelve nulos y el pedido sigue sólo en USD, que
   * es el comportamiento que ya tenía `createOrder`.
   */
  private async resolveRate(): Promise<{
    exchangeRate: number | null;
    rateDate: string | null;
  }> {
    try {
      const current = await this.exchangeRatesService.findCurrent();
      return {
        exchangeRate: Number(current.rate),
        rateDate: this.formatRateDate(current.date),
      };
    } catch {
      console.warn(
        'Exchange rate not available, continuing without VES prices',
      );
      return { exchangeRate: null, rateDate: null };
    }
  }

  /**
   * El driver de Postgres devuelve las columnas `date` como string, pero la
   * entidad las declara como `Date`. Se normalizan ambos casos.
   */
  private formatRateDate(date: Date | string): string {
    return typeof date === 'string'
      ? date.slice(0, 10)
      : date.toISOString().slice(0, 10);
  }
}

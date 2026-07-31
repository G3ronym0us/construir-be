# Contrato ERP OrbisNet — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinear `GET /api/v1/orders/on-hold` y las rutas del ERP con el contrato real de OrbisNet, corrigiendo dos errores de dinero (`total` y `price` por renglón salen con IVA cuando deben ir sin) y cuatro incompatibilidades de forma.

**Architecture:** Un serializador puro (`WooOrderSerializer`) concentra la traducción de nuestra `Order` a la forma de WooCommerce, y lo aplica el controlador v1 — no el servicio, para que el dominio no dependa de la capa de entrega. El desglose de IVA por línea deja de recalcularse al leer: se persiste en `order_items` al crear la orden, con los números que el calculador ya produce.

**Tech Stack:** NestJS · TypeORM (PostgreSQL, `synchronize: false`, migraciones explícitas) · Jest · `Intl.DateTimeFormat` para la zona horaria (sin dependencias nuevas).

**Spec:** `docs/superpowers/specs/2026-07-31-contrato-erp-orbisnet-design.md`

## Global Constraints

- Zona horaria de emisión: **`America/Caracas`**, configurable vía `STORE_TIMEZONE`.
- `line_items[].total` y `line_items[].price` van **sin IVA**. El `total` de la orden **sí** lo incluye.
- Invariante del contrato: `Σ line_items[].total + Σ line_items[].total_tax === order.total`.
- Los campos de `billing` y `customer_note` se emiten como **string vacío**, nunca `null`.
- `line_items[].price` se emite **sin redondear** (WooCommerce emite `0.9099999999999999`).
- Órdenes anteriores a la migración: `base`/`iva` en `NULL`, desglose derivado al vuelo, **emitido bajo la convención correcta**. Sin backfill.
- Migraciones con `yarn migration:run`. Nunca `synchronize`.
- Comentarios y mensajes de commit en español, siguiendo el estilo del repo.

---

### Task 1: Persistir el desglose de IVA por línea

`order_items` guarda hoy `price` y `subtotal`, ambos con IVA incluido, pero no la base ni el impuesto. Sin eso, el serializador tiene que recalcular el IVA leyendo `item.product.ivaType` — el estado **vivo** del producto — y un `PATCH /products/:uuid { ivaType }` le reescribe el impuesto a órdenes ya facturadas. El calculador ya produce `base` e `iva` por línea (`PricedLine`); hoy se descartan.

**Files:**
- Modify: `src/orders/order-item.entity.ts` (después de `subtotal`, línea ~51)
- Create: `src/database/migrations/1785480000000-AddIvaBreakdownToOrderItems.ts`
- Modify: `src/orders/orders.service.ts` (bloque de creación de items en `createOrder`, líneas ~665-688)
- Test: `src/orders/orders.service.createOrder.ivaBreakdown.spec.ts`

**Interfaces:**
- Consumes: `PricedLine` de `src/orders/order-pricing.service.ts`, que ya expone `base: number` e `iva: number` por línea.
- Produces: `OrderItem.base: number | null` y `OrderItem.iva: number | null`. La Task 2 los lee.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/orders/orders.service.createOrder.ivaBreakdown.spec.ts`. Copiar la estructura de providers de `src/orders/orders.service.createOrder.exchangeRate.spec.ts` (mismo módulo de testing, mismos mocks) y quedarse con esta prueba:

```typescript
it('persiste base e iva de cada línea, y base + iva === subtotal', async () => {
  // `pricing.lines` trae el desglose ya calculado; hasta ahora se descartaba.
  orderPricingService.price.mockResolvedValue({
    lines: [
      {
        product: { id: 10, name: 'Cemento', sku: 'CEM-001' },
        quantity: 2,
        unitPrice: 11.6,
        lineTotal: 23.2,
        discount: 0,
        base: 20.0,
        iva: 3.2,
        total: 23.2,
        baseVes: null,
        ivaVes: null,
        totalVes: null,
      },
    ],
    subtotal: 20.0,
    tax: 3.2,
    shipping: 0,
    discount: 0,
    discountId: null,
    discountCode: null,
    discountUuid: null,
    total: 23.2,
    exchangeRate: null,
    rateDate: null,
    subtotalVes: null,
    taxVes: null,
    discountVes: null,
    totalVes: null,
  });

  await service.createOrder(createOrderDto, null);

  const [persistedItems] = orderItemRepo.save.mock.calls[0];
  expect(persistedItems[0]).toMatchObject({ base: 20.0, iva: 3.2 });
  expect(persistedItems[0].base + persistedItems[0].iva).toBeCloseTo(
    persistedItems[0].subtotal,
    2,
  );
});
```

`orderItemRepo` debe ser el mock de `getRepositoryToken(OrderItem)` con `create: jest.fn((x) => x)` y `save: jest.fn()`.

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `npx jest src/orders/orders.service.createOrder.ivaBreakdown.spec.ts`
Expected: FAIL — `base` e `iva` llegan `undefined` en el objeto persistido.

- [ ] **Step 3: Agregar las columnas a la entidad**

En `src/orders/order-item.entity.ts`, justo después de la propiedad `subtotal`:

```typescript
  /**
   * Desglose de la línea, congelado al crear el pedido.
   *
   * `subtotal` es inclusivo de IVA; estos dos lo abren: `base + iva === subtotal`.
   * Se persisten porque el contrato del ERP pide el monto SIN impuesto, y
   * derivarlo al leer obligaba a mirar `product.ivaType` — el estado vivo del
   * producto — de modo que cambiarle la alícuota a un producto le reescribía el
   * impuesto a órdenes ya facturadas.
   *
   * Nulos en las órdenes anteriores a la migración: no se rellenaron porque
   * recalcularlas con la alícuota de hoy es justo el error que esto corrige.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  base: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  iva: number | null;
```

- [ ] **Step 4: Crear la migración**

Crear `src/database/migrations/1785480000000-AddIvaBreakdownToOrderItems.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Congela el desglose de IVA de cada renglón al crear el pedido.
 *
 * `order_items` guardaba `price` y `subtotal` con IVA incluido, pero no la base
 * ni el impuesto. El contrato del ERP pide el monto SIN impuesto por renglón, y
 * derivarlo al leer obligaba a consultar `products.iva_type` — el estado vivo
 * del producto. Con eso, un cambio de alícuota le reescribía el impuesto a
 * órdenes ya facturadas, y un producto borrado hacía asumir 16% sobre una línea
 * que podía ser exenta.
 *
 * Sin backfill, a propósito: las filas existentes quedan en NULL y el
 * serializador deriva su desglose al vuelo. Rellenarlas con la alícuota actual
 * sería cometer exactamente el error que esta columna evita.
 */
export class AddIvaBreakdownToOrderItems1785480000000
  implements MigrationInterface
{
  name = 'AddIvaBreakdownToOrderItems1785480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "base" numeric(10,2)`,
    );
    await queryRunner.query(`ALTER TABLE "order_items" ADD "iva" numeric(10,2)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "iva"`);
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "base"`);
  }
}
```

- [ ] **Step 5: Escribir el desglose al crear la orden**

En `src/orders/orders.service.ts`, dentro del bucle `for (const line of pricing.lines)` de `createOrder`, agregar los dos campos al objeto que se le pasa a `this.orderItemRepository.create({...})`, justo después de `subtotal: line.total`:

```typescript
        // El desglose que ya calculó `price()`, congelado acá para que el
        // contrato del ERP no dependa del `ivaType` vivo del producto.
        base: line.base,
        iva: line.iva,
```

- [ ] **Step 6: Correr la migración**

Run: `yarn migration:run`
Expected: aplica `AddIvaBreakdownToOrderItems1785480000000`.

Verificar: `psql -h localhost -U postgres -d construir_db -c "\d order_items"` muestra `base` e `iva` como `numeric(10,2)` nullable.

- [ ] **Step 7: Correr las pruebas**

Run: `npx jest src/orders/orders.service.createOrder.ivaBreakdown.spec.ts src/orders/orders.service.createOrder.exchangeRate.spec.ts`
Expected: PASS ambas.

- [ ] **Step 8: Commit**

```bash
git add src/orders/order-item.entity.ts src/database/migrations/1785480000000-AddIvaBreakdownToOrderItems.ts src/orders/orders.service.ts src/orders/orders.service.createOrder.ivaBreakdown.spec.ts
git commit -m "feat(orders): congelar el desglose de IVA de cada renglón al crear el pedido"
```

---

### Task 2: Configurar la zona horaria de la tienda

`date_created` se emite hoy en UTC (`toISOString().slice(0, 19)`) mientras WooCommerce emite hora local del sitio, con el mismo formato y sin marcador de zona. Para Venezuela son 4 horas de corrimiento en cada orden.

**Files:**
- Modify: `src/config/configuration.ts` (interfaz `AppConfig` ~línea 22 y `appConfig` ~línea 80)
- Modify: `CLAUDE.md` (lista de variables de entorno requeridas)

**Interfaces:**
- Produces: `config.get('app.storeTimezone')` devuelve un string de zona IANA. La Task 3 lo consume.

- [ ] **Step 1: Agregar el campo a la interfaz**

En `src/config/configuration.ts`, dentro de `export interface AppConfig`, después de `storeMapUrl: string;`:

```typescript
  /** Zona IANA en la que el ERP espera las fechas. WooCommerce emite hora local del sitio. */
  storeTimezone: string;
```

- [ ] **Step 2: Agregar el valor por defecto**

En `appConfig`, después de `storeMapUrl: process.env.STORE_MAP_URL ?? '',`:

```typescript
    // Explícita y no heredada del servidor: el contrato del ERP emite fechas
    // sin marcador de zona, así que un servidor en UTC las corría 4 horas.
    storeTimezone: process.env.STORE_TIMEZONE || 'America/Caracas',
```

Nótese el `||` y no `??`: una zona vacía no es un valor válido, a diferencia de los `STORE_*` de texto que sí admiten `""`.

- [ ] **Step 3: Documentar la variable**

En `CLAUDE.md`, en el bloque de variables de entorno de la sección «Configuration», agregar `STORE_TIMEZONE` al final de la línea de `STORE_*`:

```
APP_URL, STORE_NAME, STORE_ADDRESS, STORE_CITY, STORE_PHONE, STORE_HOURS, STORE_MAP_URL, STORE_TIMEZONE
```

- [ ] **Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/config/configuration.ts CLAUDE.md
git commit -m "feat(config): zona horaria explícita de la tienda para el contrato del ERP"
```

---

### Task 3: El serializador del contrato WooCommerce

Todas las rarezas del contrato en un archivo: montos sin IVA, strings vacíos, hora local, la identificación duplicada en `address_2`. Función pura, sin repositorios ni `async`.

**Files:**
- Create: `src/api-v1/orders/woo-order.serializer.ts`
- Test: `src/api-v1/orders/woo-order.serializer.spec.ts`

**Interfaces:**
- Consumes: `OrderItem.base` / `.iva` de la Task 1. `config.get('app.storeTimezone')` de la Task 2.
- Produces:
  - `toWooOrder(order: Order, timeZone: string): WooOrder`
  - `interface WooOrder` con `id, status, date_created, total, total_tax, billing, payment_method_title, customer_note, number, line_items`
  - `interface WooLineItem` con `id, name, product_id, quantity, tax_class, tax_rate, total, total_tax, sku, price`
  - La Task 4 llama a `toWooOrder`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/api-v1/orders/woo-order.serializer.spec.ts`:

```typescript
import { toWooOrder } from './woo-order.serializer';
import { round2 } from '../../products/iva.util';
import { Order, OrderStatus, DeliveryMethod } from '../../orders/order.entity';
import { OrderItem } from '../../orders/order-item.entity';
import { ShippingAddress } from '../../orders/shipping-address.entity';
import { GuestCustomer } from '../../orders/guest-customer.entity';
import { User } from '../../users/user.entity';
import { Product } from '../../products/product.entity';
import { IvaType } from '../../products/enums/iva-type.enum';

const TZ = 'America/Caracas';

const makeItem = (overrides: Partial<OrderItem> = {}): OrderItem =>
  ({
    id: 1,
    productName: 'Cemento',
    productSku: 'CEM-001',
    product: { id: 10, ivaType: IvaType.NORMAL } as Product,
    quantity: 2,
    price: 11.6,
    subtotal: 23.2,
    base: 20.0,
    iva: 3.2,
    ...overrides,
  }) as OrderItem;

const makeOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 34,
    status: OrderStatus.ON_HOLD,
    createdAt: new Date('2026-07-31T04:37:03.000Z'),
    total: 23.2,
    tax: 3.2,
    deliveryMethod: DeliveryMethod.PICKUP,
    notes: null,
    user: null,
    guestEmail: null,
    guestCustomer: null,
    shippingAddress: null,
    items: [makeItem()],
    ...overrides,
  }) as Order;

describe('toWooOrder', () => {
  describe('convención de impuestos', () => {
    it('emite el total del renglón SIN IVA y el impuesto aparte', () => {
      const woo = toWooOrder(makeOrder(), TZ);

      expect(woo.line_items[0].total).toBe('20.00');
      expect(woo.line_items[0].total_tax).toBe('3.20');
    });

    it('emite price como el unitario sin IVA, sin redondear', () => {
      const woo = toWooOrder(makeOrder(), TZ);

      expect(woo.line_items[0].price).toBe(10);
      expect(
        Math.round(woo.line_items[0].price * woo.line_items[0].quantity * 100) /
          100,
      ).toBe(Number(woo.line_items[0].total));
    });

    // La invariante del contrato: los renglones van sin IVA y el total de la
    // orden lo incluye. Es la que hoy NO se cumple.
    it('Σ total + Σ total_tax de los renglones da el total de la orden', () => {
      const order = makeOrder({
        total: 34.8,
        tax: 4.8,
        items: [
          makeItem({ id: 1, base: 20.0, iva: 3.2, subtotal: 23.2 }),
          makeItem({ id: 2, base: 10.0, iva: 1.6, subtotal: 11.6 }),
        ],
      });

      const woo = toWooOrder(order, TZ);
      const sumTotal = woo.line_items.reduce(
        (acc, l) => acc + Number(l.total),
        0,
      );
      const sumTax = woo.line_items.reduce(
        (acc, l) => acc + Number(l.total_tax),
        0,
      );

      expect(Math.round((sumTotal + sumTax) * 100) / 100).toBe(
        Number(woo.total),
      );
    });

    it('deriva tax_rate del desglose guardado y emite tax_class vacío', () => {
      const woo = toWooOrder(makeOrder(), TZ);

      expect(woo.line_items[0].tax_rate).toBe(16);
      expect(woo.line_items[0].tax_class).toBe('');
    });

    it('no divide por cero cuando la base quedó en 0 por descuento', () => {
      const order = makeOrder({
        items: [makeItem({ base: 0, iva: 0, subtotal: 0 })],
      });

      expect(toWooOrder(order, TZ).line_items[0].tax_rate).toBe(0);
    });
  });

  describe('órdenes anteriores a la migración', () => {
    // base/iva en NULL: se deriva al vuelo del ivaType vivo, pero se emite
    // bajo la convención correcta igual que una orden nueva.
    it('deriva el desglose y lo emite sin IVA', () => {
      const order = makeOrder({
        items: [makeItem({ base: null, iva: null, subtotal: 23.2 })],
      });

      const woo = toWooOrder(order, TZ);

      expect(woo.line_items[0].total).toBe('20.00');
      expect(woo.line_items[0].total_tax).toBe('3.20');
    });

    it('trata un producto borrado como alícuota normal, igual que antes', () => {
      const order = makeOrder({
        items: [makeItem({ base: null, iva: null, product: null })],
      });

      expect(toWooOrder(order, TZ).line_items[0].total_tax).toBe('3.20');
    });

    it('respeta la exención cuando el desglose guardado dice 0', () => {
      const order = makeOrder({
        items: [makeItem({ base: 23.2, iva: 0, subtotal: 23.2, product: null })],
      });

      expect(toWooOrder(order, TZ).line_items[0].total_tax).toBe('0.00');
    });
  });

  describe('billing', () => {
    it('emite strings vacíos, nunca null', () => {
      const woo = toWooOrder(makeOrder(), TZ);

      expect(woo.billing).toMatchObject({
        first_name: '',
        last_name: '',
        company: '',
        address_1: '',
        address_2: '',
        city: '',
        email: '',
        phone: '',
      });
      expect(woo.customer_note).toBe('');
    });

    it('resuelve nombre y correo del usuario autenticado', () => {
      const order = makeOrder({
        user: {
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'juan@test.com',
          identificationType: 'V',
          identificationNumber: '12345678',
        } as User,
      });

      expect(toWooOrder(order, TZ).billing).toMatchObject({
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@test.com',
      });
    });

    it('resuelve del guest customer cuando no hay usuario', () => {
      const order = makeOrder({
        guestEmail: 'guest@test.com',
        guestCustomer: {
          firstName: 'María',
          lastName: 'González',
          email: 'guest@test.com',
        } as GuestCustomer,
      });

      expect(toWooOrder(order, TZ).billing).toMatchObject({
        first_name: 'María',
        last_name: 'González',
        email: 'guest@test.com',
      });
    });

    it('cae al guestEmail cuando no hay perfil', () => {
      const order = makeOrder({ guestEmail: 'suelto@test.com' });

      expect(toWooOrder(order, TZ).billing.email).toBe('suelto@test.com');
    });

    it('emite la identificación en address_2 y en identification', () => {
      const order = makeOrder({
        guestCustomer: {
          identificationType: 'V',
          identificationNumber: '20708398',
        } as GuestCustomer,
      });

      const { billing } = toWooOrder(order, TZ);
      expect(billing.address_2).toBe('V-20708398');
      expect(billing.identification).toBe('V-20708398');
    });

    it('la dirección de envío tiene prioridad para la identificación', () => {
      const order = makeOrder({
        guestCustomer: {
          identificationType: 'V',
          identificationNumber: '111',
        } as GuestCustomer,
        shippingAddress: {
          identificationType: 'J',
          identificationNumber: '222',
        } as ShippingAddress,
      });

      expect(toWooOrder(order, TZ).billing.address_2).toBe('J-222');
    });

    // Una orden de pickup no tiene dirección de envío; el teléfono vive en el
    // perfil y sin él no se coordina el retiro.
    it('toma el teléfono del perfil cuando no hay dirección de envío', () => {
      const order = makeOrder({
        guestCustomer: { phone: '04249428607' } as GuestCustomer,
      });

      expect(toWooOrder(order, TZ).billing.phone).toBe('04249428607');
    });

    it('la dirección de envío tiene prioridad para el teléfono', () => {
      const order = makeOrder({
        guestCustomer: { phone: '04249428607' } as GuestCustomer,
        shippingAddress: { phone: '04121234567' } as ShippingAddress,
      });

      expect(toWooOrder(order, TZ).billing.phone).toBe('04121234567');
    });
  });

  // El ancla de todo el contrato: una orden equivalente a la 6284 del payload
  // real de OrbisNet, con sus cuatro renglones y sus números exactos.
  describe('caso de referencia: la orden 6284 de OrbisNet', () => {
    const referencia = () =>
      makeOrder({
        id: 6284,
        total: 124.79,
        tax: 17.21,
        createdAt: new Date('2023-11-14T21:48:13.000Z'), // 17:48:13 en Caracas
        guestCustomer: {
          firstName: 'Jesus',
          lastName: 'Morales',
          email: 'admin@constru-ir.com',
          phone: '04120776574',
          identificationType: 'V',
          identificationNumber: '20708398',
        } as GuestCustomer,
        items: [
          makeItem({
            id: 75,
            productName: 'BOMBA AGUA  1/2HP PERIF GENPAR GBP-050-A',
            quantity: 3,
            base: 98.46,
            iva: 15.75,
            subtotal: 114.21,
          }),
          makeItem({
            id: 76,
            productName: 'CODO HG  1/2X90',
            quantity: 5,
            base: 4.55,
            iva: 0.73,
            subtotal: 5.28,
          }),
          makeItem({
            id: 77,
            productName: 'CODO PCO A/B S 1/2X090',
            quantity: 7,
            base: 2.17,
            iva: 0.35,
            subtotal: 2.52,
          }),
          makeItem({
            id: 78,
            productName: 'CODO UNIT AB  1/2X90 SOLD UNITECA',
            quantity: 10,
            base: 2.4,
            iva: 0.38,
            subtotal: 2.78,
          }),
        ],
      });

    it('emite los renglones con los montos exactos del payload real', () => {
      const woo = toWooOrder(referencia(), TZ);

      expect(
        woo.line_items.map((l) => ({
          total: l.total,
          total_tax: l.total_tax,
          quantity: l.quantity,
        })),
      ).toEqual([
        { total: '98.46', total_tax: '15.75', quantity: 3 },
        { total: '4.55', total_tax: '0.73', quantity: 5 },
        { total: '2.17', total_tax: '0.35', quantity: 7 },
        { total: '2.40', total_tax: '0.38', quantity: 10 },
      ]);
    });

    it('reproduce el price unitario de cada renglón', () => {
      const woo = toWooOrder(referencia(), TZ);
      const precios = woo.line_items.map((l) => round2(l.price));

      expect(precios).toEqual([32.82, 0.91, 0.31, 0.24]);
    });

    it('cierra contra el total de la orden', () => {
      const woo = toWooOrder(referencia(), TZ);
      const suma = woo.line_items.reduce(
        (acc, l) => acc + Number(l.total) + Number(l.total_tax),
        0,
      );

      expect(round2(suma)).toBe(124.79);
      expect(woo.total).toBe('124.79');
      expect(woo.total_tax).toBe('17.21');
    });

    it('emite la fecha, la identificación y el teléfono como los espera el ERP', () => {
      const woo = toWooOrder(referencia(), TZ);

      expect(woo.date_created).toBe('2023-11-14T17:48:13');
      expect(woo.number).toBe('6284');
      expect(woo.billing.address_2).toBe('V-20708398');
      expect(woo.billing.phone).toBe('04120776574');
    });
  });

  describe('resto del contrato', () => {
    it('emite date_created en hora local de la tienda', () => {
      // 04:37 UTC son las 00:37 en Caracas: cruza el cambio de día.
      const woo = toWooOrder(makeOrder(), TZ);

      expect(woo.date_created).toBe('2026-07-31T00:37:03');
    });

    it('number es el id como string', () => {
      expect(toWooOrder(makeOrder(), TZ).number).toBe('34');
    });

    it('traduce el método de entrega', () => {
      expect(toWooOrder(makeOrder(), TZ).payment_method_title).toBe(
        'Entrega y/o recogida en el local',
      );
      expect(
        toWooOrder(makeOrder({ deliveryMethod: DeliveryMethod.DELIVERY }), TZ)
          .payment_method_title,
      ).toBe('Envío a domicilio');
    });

    it('emite product_id 0 cuando el producto fue borrado', () => {
      const order = makeOrder({ items: [makeItem({ product: null })] });

      expect(toWooOrder(order, TZ).line_items[0].product_id).toBe(0);
    });

    it('el total de la orden sí incluye el IVA', () => {
      const woo = toWooOrder(makeOrder(), TZ);

      expect(woo.total).toBe('23.20');
      expect(woo.total_tax).toBe('3.20');
    });
  });
});
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `npx jest src/api-v1/orders/woo-order.serializer.spec.ts`
Expected: FAIL — `Cannot find module './woo-order.serializer'`.

- [ ] **Step 3: Escribir el serializador**

Crear `src/api-v1/orders/woo-order.serializer.ts`:

```typescript
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
  if (item.base !== null && item.base !== undefined && item.iva !== null && item.iva !== undefined) {
    return { base: Number(item.base), iva: Number(item.iva) };
  }

  const ivaType = item.product?.ivaType ?? IvaType.NORMAL;
  const rate = IVA_RATES[ivaType];
  const subtotal = Number(item.subtotal);
  const iva = round2((subtotal * rate) / (1 + rate));

  return { base: round2(subtotal - iva), iva };
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
    tax_rate: base > 0 ? round2((iva / base) * 100) : 0,
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
```

- [ ] **Step 4: Correr las pruebas**

Run: `npx jest src/api-v1/orders/woo-order.serializer.spec.ts`
Expected: PASS, 25 casos — incluidos los 4 del caso de referencia, que son los
que prueban que el contrato quedó bien contra el payload real de OrbisNet.

- [ ] **Step 5: Commit**

```bash
git add src/api-v1/orders/woo-order.serializer.ts src/api-v1/orders/woo-order.serializer.spec.ts
git commit -m "feat(api-v1): serializador del contrato WooCommerce que espera OrbisNet"
```

---

### Task 4: Conectar el serializador y adelgazar el servicio

`getPendingOrders` pasa a devolver entidades y el controlador v1 las traduce. Importa la dirección: si el servicio —que es dominio— importara el serializador de `api-v1`, el dominio dependería de la capa de entrega.

**Files:**
- Modify: `src/orders/orders.service.ts:1540-1664` (`getPendingOrders`)
- Modify: `src/api-v1/orders/orders-v1.controller.ts` (imports y `findPending` ~línea 120)
- Modify: `src/orders/orders.service.getPendingOrders.spec.ts` (reemplazo completo)

**Interfaces:**
- Consumes: `toWooOrder(order, timeZone)` y `WooOrder` de la Task 3. `app.storeTimezone` de la Task 2.
- Produces: `getPendingOrders(page, perPage)` devuelve `{ data: Order[]; total; page; perPage; lastPage }`.

- [ ] **Step 1: Reemplazar el spec del servicio**

`src/orders/orders.service.getPendingOrders.spec.ts` verifica hoy la forma del contrato; eso pasó al spec del serializador en la Task 3. Reemplazar **todo el archivo** por esta versión, que verifica lo que le queda al servicio. Conservar el bloque de providers del archivo original (los mismos mocks e imports de `Test.createTestingModule`), cambiando sólo `makeOrder` y las pruebas:

```typescript
  const makeOrder = (overrides: Partial<Order> = {}): Order =>
    ({
      id: 100,
      status: OrderStatus.ON_HOLD,
      createdAt: new Date('2026-03-07T10:00:00.000Z'),
      total: 20.0,
      items: [{ id: 1, quantity: 2 }],
      ...overrides,
    }) as Order;

  it('devuelve vacío cuando no hay órdenes on-hold', async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    const result = await service.getPendingOrders();

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.lastPage).toBe(1);
  });

  // El servicio ya no traduce al contrato del ERP: eso es del serializador.
  it('devuelve las entidades sin transformar', async () => {
    const order = makeOrder();
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[order], 1]);

    const result = await service.getPendingOrders();

    expect(result.data).toEqual([order]);
  });

  it('filtra por on-hold', async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    await service.getPendingOrders();

    expect(mockQueryBuilder.where).toHaveBeenCalledWith(
      'order.status = :status',
      { status: OrderStatus.ON_HOLD },
    );
  });

  it('pagina con skip y take', async () => {
    mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 25]);

    const result = await service.getPendingOrders(3, 10);

    expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20);
    expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    expect(result.lastPage).toBe(3);
  });
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx jest src/orders/orders.service.getPendingOrders.spec.ts`
Expected: FAIL en «devuelve las entidades sin transformar» — hoy devuelve objetos del contrato.

- [ ] **Step 3: Adelgazar `getPendingOrders`**

En `src/orders/orders.service.ts`, reemplazar el método completo (desde `async getPendingOrders(` hasta su `}` de cierre) por:

```typescript
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
```

- [ ] **Step 4: Limpiar los imports que quedaron sin uso**

`IVA_RATES` y `DeliveryMethod` pueden haber quedado sin usar en `orders.service.ts`.

Run: `npx tsc --noEmit` y quitar de las líneas 10 y 21 sólo lo que el compilador reporte como no usado. `IvaType` sigue en uso en otros métodos — verificar antes de borrar.

- [ ] **Step 5: Serializar en el controlador**

En `src/api-v1/orders/orders-v1.controller.ts`, agregar a los imports:

```typescript
import { ConfigService } from '@nestjs/config';
import { toWooOrder } from './woo-order.serializer';
```

Cambiar el constructor:

```typescript
  constructor(
    private readonly ordersService: OrdersService,
    private readonly config: ConfigService,
  ) {}
```

Y reemplazar el cuerpo de `findPending`:

```typescript
  async findPending(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(10), ParseIntPipe) perPage: number,
  ) {
    const result = await this.ordersService.getPendingOrders(page, perPage);
    const timeZone = this.config.get<string>('app.storeTimezone')!;

    return {
      ...result,
      data: result.data.map((order) => toWooOrder(order, timeZone)),
    };
  }
```

- [ ] **Step 6: Correr las pruebas**

Run: `npx jest src/orders/orders.service.getPendingOrders.spec.ts src/api-v1/orders/woo-order.serializer.spec.ts`
Expected: PASS ambas.

- [ ] **Step 7: Verificar contra el servidor**

Con el servidor corriendo y una orden `on-hold` en la base:

```bash
curl -s -H "Authorization: Bearer <consumer_key>:<consumer_secret>" \
  "http://localhost:3000/api/v1/orders/on-hold?page=1&perPage=5" \
  | python3 -c "
import sys, json
o = json.load(sys.stdin)['data'][0]
st = sum(float(l['total']) for l in o['line_items'])
sx = sum(float(l['total_tax']) for l in o['line_items'])
print('Σ total:', round(st,2), '+ Σ tax:', round(sx,2), '=', round(st+sx,2))
print('total de la orden:', o['total'], '| cuadra:', round(st+sx,2) == float(o['total']))
print('billing sin nulos:', all(v is not None for v in o['billing'].values()))
print('date_created:', o['date_created'])
"
```

Expected: `cuadra: True`, `billing sin nulos: True`, y `date_created` en hora de Caracas.

- [ ] **Step 8: Commit**

```bash
git add src/orders/orders.service.ts src/api-v1/orders/orders-v1.controller.ts src/orders/orders.service.getPendingOrders.spec.ts
git commit -m "refactor(api-v1): serializar el contrato del ERP en el controlador, no en el servicio"
```

---

### Task 5: Aceptar `canceled` y `cancelled`

El documento de OrbisNet dice `status: canceled`, con una sola L; nuestro enum es `cancelled`. Si mandan esa grafía, el `@IsIn` responde 400 de validación y la anulación nunca llega al servicio. No sabemos si el documento tiene un typo, así que se aceptan las dos.

**Files:**
- Modify: `src/orders/dto/update-order-external.dto.ts`
- Modify: `src/api-v1/orders/orders-v1.controller.ts` (`updateByExternal`, rama final)
- Test: `src/orders/dto/update-order-external.dto.spec.ts`

**Interfaces:**
- Produces: `UpdateOrderExternalDto.status` acepta `'pending' | 'completed' | 'cancelled' | 'canceled'`; el controlador normaliza a `cancelled`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/orders/dto/update-order-external.dto.spec.ts`:

```typescript
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateOrderExternalDto } from './update-order-external.dto';

const validateDto = async (payload: Record<string, unknown>) =>
  validate(plainToInstance(UpdateOrderExternalDto, payload));

describe('UpdateOrderExternalDto', () => {
  // OrbisNet documenta `canceled` con una sola L. No sabemos si es un typo del
  // documento, así que se aceptan ambas antes que romper la anulación.
  it.each(['canceled', 'cancelled'])('acepta status "%s"', async (status) => {
    const errors = await validateDto({
      status,
      date_completed: '2026-07-31T02:00:00.000Z',
    });

    expect(errors).toHaveLength(0);
  });

  it.each(['pending', 'completed'])('acepta status "%s"', async (status) => {
    const errors = await validateDto({
      status,
      order_key: 'OC-001',
      date_completed: '2026-07-31T02:00:00.000Z',
    });

    expect(errors).toHaveLength(0);
  });

  it('rechaza un status desconocido', async () => {
    const errors = await validateDto({ status: 'refunded' });

    expect(errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx jest src/orders/dto/update-order-external.dto.spec.ts`
Expected: FAIL en `canceled` — `@IsIn` sólo admite `cancelled`.

- [ ] **Step 3: Aceptar ambas grafías en el DTO**

En `src/orders/dto/update-order-external.dto.ts`, reemplazar el bloque de `ERP_STATUSES` y el campo `status`:

```typescript
/**
 * El documento de OrbisNet escribe la anulación como `canceled`, con una sola
 * L, mientras nuestro enum usa `cancelled`. No está confirmado si es un typo
 * del documento o la grafía real que envían, y equivocarse cuesta que toda
 * anulación muera en un 400 de validación sin llegar al servicio. Se aceptan
 * las dos y el controlador normaliza.
 */
const ERP_STATUSES = [
  OrderStatus.PENDING,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
  'canceled',
] as const;

export type ErpStatus = (typeof ERP_STATUSES)[number];
```

- [ ] **Step 4: Normalizar en el controlador**

En `src/api-v1/orders/orders-v1.controller.ts`, en `updateByExternal`, la rama final que hoy dice `// cancelled` ya cubre ambas por descarte —es el `else` de `pending` y `completed`—, así que no hace falta tocar la lógica. Verificar que el comentario lo diga:

```typescript
    // cancelled — incluye la grafía `canceled` que documenta OrbisNet: esta
    // rama es el descarte de `pending` y `completed`.
    if (!dto.date_completed) {
```

- [ ] **Step 5: Correr las pruebas**

Run: `npx jest src/orders/dto/update-order-external.dto.spec.ts`
Expected: PASS.

- [ ] **Step 6: Verificar contra el servidor**

Con una orden en `on-hold` (id `<N>`):

```bash
curl -s -w "\n%{http_code}\n" -X PUT \
  -H "Authorization: Bearer <consumer_key>:<consumer_secret>" \
  -H 'Content-Type: application/json' \
  -d '{"status":"canceled","date_completed":"2026-07-31T02:00:00"}' \
  "http://localhost:3000/api/v1/orders/<N>"
```

Expected: `200`, y la orden queda en `cancelled`.

- [ ] **Step 7: Commit**

```bash
git add src/orders/dto/update-order-external.dto.ts src/orders/dto/update-order-external.dto.spec.ts src/api-v1/orders/orders-v1.controller.ts
git commit -m "fix(api-v1): aceptar las dos grafías de canceled que puede enviar el ERP"
```

---

### Task 6: `GET /api/v1/orders/:id` acepta id numérico y responde 404

El integrador consultó `GET /api/v1/orders/13` dos veces y recibió 500 (registrado en `api_request_logs`, 2026-04-09 y 2026-04-10). Es razonable que lo intentara: todo el resto del contrato usa el id numérico. Postgres falla al castear `'13'` a `uuid` y el error sale como 500.

**Files:**
- Modify: `src/orders/orders.service.ts` (método nuevo, después de `findOneByUuid` ~línea 846)
- Modify: `src/api-v1/orders/orders-v1.controller.ts` (`findOne` ~línea 148)
- Test: `src/orders/orders.service.findOneForErp.spec.ts`

**Interfaces:**
- Produces: `OrdersService.findOneForErp(identifier: string): Promise<Order>`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/orders/orders.service.findOneForErp.spec.ts`. Copiar el bloque de providers de `src/orders/orders.service.acknowledgeOrder.spec.ts` (mismos mocks) y quedarse con:

```typescript
  const order = { id: 13, uuid: 'b2c3d4e5-f6a7-4901-bcde-234567890abc' } as Order;

  it('busca por id cuando el identificador es numérico', async () => {
    orderRepo.findOne.mockResolvedValue(order);

    const result = await service.findOneForErp('13');

    expect(orderRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 13 } }),
    );
    expect(result).toBe(order);
  });

  it('busca por uuid cuando el identificador es un uuid', async () => {
    orderRepo.findOne.mockResolvedValue(order);

    await service.findOneForErp('b2c3d4e5-f6a7-4901-bcde-234567890abc');

    expect(orderRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { uuid: 'b2c3d4e5-f6a7-4901-bcde-234567890abc' },
      }),
    );
  });

  it('responde 404 cuando no existe', async () => {
    orderRepo.findOne.mockResolvedValue(null);

    await expect(service.findOneForErp('999')).rejects.toThrow(
      NotFoundException,
    );
  });

  // Sin esta guarda, un valor que no es ni id ni uuid llega a Postgres y el
  // casteo fallido sale como 500 — el mismo error que esto corrige.
  it('responde 404 sin consultar la base cuando no es ni id ni uuid', async () => {
    await expect(service.findOneForErp('abc')).rejects.toThrow(
      NotFoundException,
    );
    expect(orderRepo.findOne).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx jest src/orders/orders.service.findOneForErp.spec.ts`
Expected: FAIL — `service.findOneForErp is not a function`.

- [ ] **Step 3: Implementar el método**

En `src/orders/orders.service.ts`, después de `findOneByUuid`:

```typescript
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
```

- [ ] **Step 4: Usarlo en el controlador**

En `src/api-v1/orders/orders-v1.controller.ts`, cambiar `findOne` y su `@ApiParam`:

```typescript
  @ApiParam({
    name: 'id',
    description: 'ID numérico o UUID de la orden',
    example: '34',
    type: String,
  })
```

```typescript
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOneForErp(id);
  }
```

Cambiar también el decorador de ruta de `@Get(':uuid')` a `@Get(':id')`.

- [ ] **Step 5: Correr las pruebas**

Run: `npx jest src/orders/orders.service.findOneForErp.spec.ts`
Expected: PASS, 4 casos.

- [ ] **Step 6: Verificar contra el servidor**

```bash
AUTH="Bearer <consumer_key>:<consumer_secret>"
for id in 13 abc 999999; do
  echo "$id -> $(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: $AUTH" \
    "http://localhost:3000/api/v1/orders/$id")"
done
```

Expected: `13 -> 200`, `abc -> 404`, `999999 -> 404`. Ningún 500.

- [ ] **Step 7: Commit**

```bash
git add src/orders/orders.service.ts src/api-v1/orders/orders-v1.controller.ts src/orders/orders.service.findOneForErp.spec.ts
git commit -m "fix(api-v1): consultar la orden por id numérico sin reventar en 500"
```

---

### Task 7: Cerrar la documentación

`docs/pricing-iva.md` tiene anotados como pendientes tres problemas que este trabajo resuelve. Dejarlos abiertos manda al próximo lector a investigar algo ya cerrado.

**Files:**
- Modify: `docs/pricing-iva.md` (sección «Pendientes», bloque del contrato v1)
- Modify: `docs/pruebas-preproduccion.md` (agregar el hallazgo del 500)

- [ ] **Step 1: Actualizar `pricing-iva.md`**

Reemplazar el bullet «**Contrato v1 del ERP**» completo de la sección «Pendientes» por:

```markdown
- **Contrato v1 del ERP: resuelto.** El payload real de OrbisNet confirmó la
  convención: `line_items[].total` va **sin** IVA y `total_tax` aparte
  (98,46 × 0,16 = 15,75 en su ejemplo), mientras el `total` de la orden sí lo
  incluye. Emitíamos el renglón inclusivo, o sea un 13,8% de más. Corregido en
  `src/api-v1/orders/woo-order.serializer.ts`, que además reemplazó la
  extracción de IVA a mano con `.toFixed(2)` y dejó de derivar la alícuota de
  `item.product?.ivaType`: el desglose se persiste en `order_items.base` /
  `.iva` al crear el pedido. Las órdenes anteriores a esa migración siguen
  derivándolo al vuelo del `ivaType` vivo — es el comportamiento de siempre,
  pero conviene saberlo.
```

Y en la sección «Modelo», al principio del documento, reemplazar el párrafo que
empieza con «La matemática está centralizada en `src/products/iva.util.ts`, con
una excepción conocida:» y termina en «…en una sola de las dos versiones.» por:

```markdown
La matemática está centralizada en `src/products/iva.util.ts`. La excepción que
había —`getPendingOrders` reimplementaba la extracción del IVA por línea a mano,
con `.toFixed(2)` en lugar de `round2()`— desapareció: el desglose se persiste
en `order_items.base` / `.iva` al crear el pedido y el serializador del ERP lo
lee de ahí.
```

- [ ] **Step 2: Agregar el hallazgo del 500 a la bitácora**

Al final de `docs/pruebas-preproduccion.md`:

```markdown
### H-008 — `GET /api/v1/orders/:uuid` respondía 500 con un id numérico

**Severidad:** media. Bloqueaba una consulta natural del ERP.
**Detectado en:** `api_request_logs`, 2026-04-09 y 2026-04-10.

El integrador consultó `GET /api/v1/orders/13` dos veces y recibió 500 las dos.
Es razonable que lo intentara: todo el resto del contrato direcciona las órdenes
por su id numérico, y el `number` que emitimos es ese id. Esa ruta era la única
que exigía uuid, y Postgres falla al castear `'13'`.

**Arreglo:** `OrdersService.findOneForErp` resuelve por id o por uuid, y valida
la forma antes de consultar — un valor que no sea ninguno de los dos responde
404 sin llegar a la base. Sin esa guarda, `abc` habría seguido dando 500.
```

- [ ] **Step 3: Correr la suite completa**

Run: `npx tsc --noEmit && npx jest`
Expected: `tsc` limpio y todas las suites en verde.

- [ ] **Step 4: Commit**

```bash
git add docs/pricing-iva.md docs/pruebas-preproduccion.md
git commit -m "docs(erp): cerrar los pendientes que resolvió la alineación con OrbisNet"
```

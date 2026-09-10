# Rediseño de las plantillas de correo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adoptar las plantillas de correo del handoff —maquetadas en tablas para que Outlook no las rompa, con bolívar protagonista y la tasa a la vista— y los dos disparadores que faltaban.

**Architecture:** Dos módulos nuevos absorben lo que hoy cada método repite: `money.util.ts` formatea los montos duales y `payload.builder.ts` arma el bloque común (tienda, WhatsApp, logo, enlace de seguimiento). `EmailService` queda como orquestador: cargar plantilla, componer payload, enviar.

**Tech Stack:** NestJS · Handlebars (con parciales y modo estricto en las pruebas) · TypeORM · Jest · `Intl.NumberFormat` con locale `es-VE`.

**Spec:** `docs/superpowers/specs/2026-07-31-plantillas-correo-design.md`
**Origen de las plantillas:** `~/Downloads/Pantallas storefront construir-fe.zip`, carpeta `email-templates/`

## Global Constraints

- El bolívar se formatea en **`es-VE`** (punto de millares, coma decimal) y **sin** el prefijo «Bs.» — lo pone la plantilla.
- Un monto ausente se pasa como **`null`**, nunca como `"0"` ni `""`: la plantilla oculta el bloque.
- Las pruebas de plantilla compilan con **`handlebars.compile(fuente, { strict: true })`**. Por defecto Handlebars renderiza la variable ausente como cadena vacía, así que buscar `{{` en el HTML no detecta nada.
- Los campos legítimamente opcionales van dentro de `{{#if}}`, que en modo estricto no falla ante un valor ausente.
- Un fallo de correo **nunca** propaga: varios envíos ocurren después de escrituras irreversibles.
- Migraciones explícitas, nunca `synchronize`. Ejecutar con `yarn migration:run`.
- Comentarios y mensajes de commit en español, en el estilo del repo: explican *por qué*, no *qué*.
- Las pruebas del backend corren con `npx jest <ruta>`; la suite completa tarda ~2 min.

---

### Task 1: Formateo de montos duales

Los diez correos muestran Bs. protagonista con el USD de referencia. Hoy el servicio hace `.toFixed(2)` suelto y no pasa bolívares.

**Files:**
- Create: `src/email/money.util.ts`
- Test: `src/email/money.util.spec.ts`

**Interfaces:**
- Produces: `formatVes(amount: number | string | null | undefined): string | null`

> El diseño mencionaba también una función `dual()` que devolvía las dos
> monedas juntas. Al mapear las plantillas se ve que ninguna la necesita: piden
> `total` y `totalVes` como campos separados, y el USD ya lo produce el
> `.toFixed(2)` que los métodos tienen hoy. Se omite por YAGNI.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/email/money.util.spec.ts`:

```typescript
import { formatVes } from './money.util';

describe('formatVes', () => {
  it('formatea en es-VE: punto de millares y coma decimal', () => {
    expect(formatVes(110526.1)).toBe('110.526,10');
    expect(formatVes(9489.66)).toBe('9.489,66');
  });

  it('siempre deja dos decimales', () => {
    expect(formatVes(20)).toBe('20,00');
    expect(formatVes('17.5')).toBe('17,50');
  });

  it('acepta el string que devuelve TypeORM para las columnas numeric', () => {
    expect(formatVes('36283.99')).toBe('36.283,99');
  });

  // Un monto ausente tiene que viajar como null para que la plantilla oculte
  // el bloque: "Bs. 0,00" y "Bs. null" son dos formas distintas de mentir.
  it.each([null, undefined])('devuelve null ante %p', (valor) => {
    expect(formatVes(valor)).toBeNull();
  });

  it('cero es un monto válido, no un ausente', () => {
    expect(formatVes(0)).toBe('0,00');
  });
});
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx jest src/email/money.util.spec.ts`
Expected: FAIL — `Cannot find module './money.util'`.

- [ ] **Step 3: Escribir el módulo**

Crear `src/email/money.util.ts`:

```typescript
/**
 * Formateo de los montos que muestran los correos.
 *
 * El diseño pide bolívar protagonista y dólar de referencia. El bolívar va en
 * `es-VE` —punto de millares, coma decimal— y **sin** el prefijo "Bs.": lo pone
 * la plantilla, que lo maqueta aparte.
 *
 * Un monto ausente viaja como `null` y no como `"0,00"`: la plantilla oculta el
 * bloque. Un pedido facturado sin tasa disponible no tiene monto en bolívares,
 * y decir "Bs. 0,00" sería afirmar algo falso.
 */

const VES = new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Acepta el string que TypeORM devuelve para las columnas `numeric`. */
function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

export function formatVes(
  amount: number | string | null | undefined,
): string | null {
  const n = toNumber(amount);
  return n === null ? null : VES.format(n);
}
```

- [ ] **Step 4: Correr las pruebas**

Run: `npx jest src/email/money.util.spec.ts`
Expected: PASS, 6 casos.

Si `formatVes(110526.1)` devuelve `110.526,10` con un separador distinto, comprobar que el contenedor tenga los datos de locale de ICU: `node -e "console.log(new Intl.NumberFormat('es-VE').format(1234.5))"` debe imprimir `1.234,5`.

- [ ] **Step 5: Commit**

```bash
git add src/email/money.util.ts src/email/money.util.spec.ts
git commit -m "feat(email): formateo de montos duales para las plantillas nuevas"
```

---

### Task 2: Configuración de tienda y bloque común del payload

Las diez plantillas comparten cabecera, pie y datos de tienda. Hoy cada método arma ese bloque por su cuenta y dos campos no existen en configuración.

**Files:**
- Modify: `src/config/configuration.ts` (interfaz `AppConfig` y objeto `appConfig`)
- Modify: `.env.example`
- Modify: `CLAUDE.md` (lista de variables de entorno)
- Create: `src/email/payload.builder.ts`
- Test: `src/email/payload.builder.spec.ts`

**Interfaces:**
- Produces:
  - `interface CommonPayload { logoUrl: string; whatsappUrl: string | null; storeRif: string | null; store: StoreInfo }`
  - `interface StoreInfo { name: string; address: string; city: string; hours: string; phone: string; email: string; mapUrl: string }`
  - `class EmailPayloadBuilder` con `buildCommon(): CommonPayload` y `trackingUrl(orderNumber: string): string`
  - Config: `app.storeWhatsappUrl`, `app.storeRif`

- [ ] **Step 1: Agregar las dos variables a configuración**

En `src/config/configuration.ts`, dentro de `export interface AppConfig`, después de `storeMapUrl: string;`:

```typescript
  /** Enlace de contacto que ocho plantillas de correo ofrecen al cliente. */
  storeWhatsappUrl: string;
  /** Sólo lo usa la plantilla de invitación, que es un correo interno. */
  storeRif: string;
```

Y en `appConfig`, después de `storeMapUrl: process.env.STORE_MAP_URL ?? '',`:

```typescript
    // Se usa ?? y no ||, igual que los STORE_* vecinos: una cadena vacía es un
    // valor deliberado, y las plantillas ocultan el bloque cuando llega vacío.
    storeWhatsappUrl: process.env.STORE_WHATSAPP_URL ?? '',
    storeRif: process.env.STORE_RIF ?? '',
```

- [ ] **Step 2: Documentar las variables**

En `.env.example`, junto a las demás `STORE_*`:

```
STORE_WHATSAPP_URL=https://wa.me/584120000000
STORE_RIF=J-12345678-9
```

En `CLAUDE.md`, agregarlas al final de la línea de variables `STORE_*` de la sección «Configuration».

- [ ] **Step 3: Escribir las pruebas que fallan**

Crear `src/email/payload.builder.spec.ts`:

```typescript
import { EmailPayloadBuilder } from './payload.builder';
import { ConfigService } from '@nestjs/config';

function builderCon(valores: Record<string, string>): EmailPayloadBuilder {
  const config = {
    get: (clave: string) => valores[clave],
  } as unknown as ConfigService;

  return new EmailPayloadBuilder(config);
}

const COMPLETO = {
  'app.frontendUrl': 'https://constru-ir.com',
  'app.storeName': 'Construir',
  'app.storeAddress': 'Av. Bolívar 123',
  'app.storeCity': 'Ciudad Bolívar',
  'app.storeHours': 'Lunes a Viernes 8-5',
  'app.storePhone': '+58 285 632 0178',
  'app.storeEmail': 'info@constru-ir.com',
  'app.storeMapUrl': 'https://maps.example/1',
  'app.storeWhatsappUrl': 'https://wa.me/584120000000',
  'app.storeRif': 'J-12345678-9',
};

describe('EmailPayloadBuilder', () => {
  it('arma el bloque común con los datos de la tienda', () => {
    const comun = builderCon(COMPLETO).buildCommon();

    expect(comun.whatsappUrl).toBe('https://wa.me/584120000000');
    expect(comun.storeRif).toBe('J-12345678-9');
    expect(comun.store.name).toBe('Construir');
    expect(comun.store.address).toBe('Av. Bolívar 123');
    expect(comun.logoUrl).toBe('https://constru-ir.com/construir-logo.png');
  });

  // Un enlace de WhatsApp a medias es peor que ninguno: la plantilla oculta el
  // bloque cuando llega null, y no puede distinguir null de cadena vacía.
  it('devuelve null cuando el WhatsApp no está configurado', () => {
    const comun = builderCon({ ...COMPLETO, 'app.storeWhatsappUrl': '' }).buildCommon();

    expect(comun.whatsappUrl).toBeNull();
  });

  it('devuelve null cuando el RIF no está configurado', () => {
    const comun = builderCon({ ...COMPLETO, 'app.storeRif': '' }).buildCommon();

    expect(comun.storeRif).toBeNull();
  });

  it('arma el enlace de seguimiento con el número de pedido', () => {
    expect(builderCon(COMPLETO).trackingUrl('ORD-MS92XZW4-ASXE')).toBe(
      'https://constru-ir.com/seguimiento/ORD-MS92XZW4-ASXE',
    );
  });

  it('no deja doble barra cuando la url del front termina en una', () => {
    const builder = builderCon({ ...COMPLETO, 'app.frontendUrl': 'https://constru-ir.com/' });

    expect(builder.trackingUrl('ORD-1')).toBe('https://constru-ir.com/seguimiento/ORD-1');
  });
});
```

- [ ] **Step 4: Correr y verificar que fallan**

Run: `npx jest src/email/payload.builder.spec.ts`
Expected: FAIL — `Cannot find module './payload.builder'`.

- [ ] **Step 5: Escribir el módulo**

Crear `src/email/payload.builder.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * El bloque que comparten las diez plantillas de correo: cabecera, pie y datos
 * de tienda.
 *
 * Antes cada método de `EmailService` lo armaba por su cuenta, con su propia
 * copia de los `configService.get` y del enlace del logo. Con diez plantillas
 * pidiendo lo mismo, eso es una desincronización esperando ocurrir.
 *
 * Los campos sin configurar salen `null` y no como cadena vacía: la plantilla
 * decide con `{{#if}}`, y `""` es un valor verdadero que le haría pintar un
 * enlace roto.
 */

export interface StoreInfo {
  name: string;
  address: string;
  city: string;
  hours: string;
  phone: string;
  email: string;
  mapUrl: string;
}

export interface CommonPayload {
  logoUrl: string;
  whatsappUrl: string | null;
  storeRif: string | null;
  store: StoreInfo;
}

@Injectable()
export class EmailPayloadBuilder {
  constructor(private readonly configService: ConfigService) {}

  private frontendUrl(): string {
    const url =
      this.configService.get<string>('app.frontendUrl') ||
      'http://localhost:4000';
    return url.replace(/\/+$/, '');
  }

  /** Vacío y ausente son lo mismo para la plantilla: ambos ocultan el bloque. */
  private opcional(clave: string): string | null {
    const valor = this.configService.get<string>(clave);
    return valor ? valor : null;
  }

  buildCommon(): CommonPayload {
    return {
      logoUrl: `${this.frontendUrl()}/construir-logo.png`,
      whatsappUrl: this.opcional('app.storeWhatsappUrl'),
      storeRif: this.opcional('app.storeRif'),
      store: {
        name: this.configService.get<string>('app.storeName') ?? '',
        address: this.configService.get<string>('app.storeAddress') ?? '',
        city: this.configService.get<string>('app.storeCity') ?? '',
        hours: this.configService.get<string>('app.storeHours') ?? '',
        phone: this.configService.get<string>('app.storePhone') ?? '',
        email: this.configService.get<string>('app.storeEmail') ?? '',
        mapUrl: this.configService.get<string>('app.storeMapUrl') ?? '',
      },
    };
  }

  trackingUrl(orderNumber: string): string {
    return `${this.frontendUrl()}/seguimiento/${orderNumber}`;
  }
}
```

- [ ] **Step 6: Registrarlo como proveedor**

En `src/email/email.module.ts`, reemplazar el contenido por:

```typescript
import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailPayloadBuilder } from './payload.builder';

@Module({
  providers: [EmailService, EmailPayloadBuilder],
  exports: [EmailService],
})
export class EmailModule {}
```

- [ ] **Step 7: Correr las pruebas y el typecheck**

Run: `npx jest src/email/payload.builder.spec.ts && npx tsc --noEmit`
Expected: PASS, 5 casos; `tsc` sin errores.

- [ ] **Step 8: Commit**

```bash
git add src/config/configuration.ts .env.example CLAUDE.md src/email/payload.builder.ts src/email/payload.builder.spec.ts src/email/email.module.ts
git commit -m "feat(email): bloque común del payload y datos de tienda que faltaban"
```

---

### Task 3: Persistir la fecha de la tasa en la orden

Las plantillas muestran «BCV 481,22 · 19 abr». La fecha del pedido no sirve de sustituto: la tasa publicada puede ser de meses antes, y mostrar la del pedido sería mentir.

**Files:**
- Modify: `src/orders/order.entity.ts` (después de la columna `exchangeRate`)
- Create: `src/database/migrations/1785490000000-AddExchangeRateDateToOrders.ts`
- Modify: `src/orders/orders.service.ts` (asignación de campos en `createOrder`)
- Test: `src/orders/orders.service.createOrder.rateDate.spec.ts`

**Interfaces:**
- Consumes: `OrderPricing.rateDate: string | null` de `src/orders/order-pricing.service.ts`.
- Produces: `Order.exchangeRateDate: string | null`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/orders/orders.service.createOrder.rateDate.spec.ts`. Copiar el bloque completo de `Test.createTestingModule({ providers: [...] })` de `src/orders/orders.service.createOrder.ivaBreakdown.spec.ts` —incluidos todos sus mocks y el de `UsersService`— y quedarse con esta prueba:

```typescript
it('persiste la fecha de la tasa con la que se facturó', async () => {
  orderPricingService.price.mockResolvedValue({
    lines: [
      {
        product: { id: 10, name: 'Cemento', sku: 'CEM-001' },
        quantity: 1,
        unitPrice: 11.6,
        lineTotal: 11.6,
        discount: 0,
        base: 10.0,
        iva: 1.6,
        total: 11.6,
        baseVes: null,
        ivaVes: null,
        totalVes: null,
      },
    ],
    subtotal: 10.0,
    tax: 1.6,
    shipping: 0,
    discount: 0,
    discountId: null,
    discountCode: null,
    discountUuid: null,
    total: 11.6,
    exchangeRate: 481.22,
    // El calculador ya la produce; hasta ahora se descartaba.
    rateDate: '2026-04-19',
    subtotalVes: 4812.2,
    taxVes: 769.95,
    discountVes: null,
    totalVes: 5582.15,
  });

  await service.createOrder(createOrderDto, null);

  expect(orderRepo.save).toHaveBeenCalledWith(
    expect.objectContaining({
      exchangeRate: 481.22,
      exchangeRateDate: '2026-04-19',
    }),
  );
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx jest src/orders/orders.service.createOrder.rateDate.spec.ts`
Expected: FAIL — el objeto guardado no tiene `exchangeRateDate`.

- [ ] **Step 3: Agregar la columna a la entidad**

En `src/orders/order.entity.ts`, justo después de la columna `exchangeRate`:

```typescript
  /**
   * Fecha de la tasa con la que se facturó, no la del pedido.
   *
   * La tasa publicada del BCV puede ser de días o meses antes: en la base
   * local la más reciente era del 2026-04-19 mientras los pedidos eran de
   * julio. Los correos muestran "BCV 481,22 · 19 abr", así que usar
   * `createdAt` como sustituto le mostraría al cliente una fecha falsa.
   *
   * Nula en los pedidos anteriores a la migración: la tasa vigente entonces no
   * se puede reconstruir con certeza, así que el correo omite la fecha.
   */
  @Column({ name: 'exchange_rate_date', type: 'date', nullable: true })
  exchangeRateDate: string | null;
```

- [ ] **Step 4: Crear la migración**

Crear `src/database/migrations/1785490000000-AddExchangeRateDateToOrders.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Guarda la fecha de la tasa con la que se facturó cada pedido.
 *
 * `OrderPricingService` ya la calcula (`rateDate`) y hasta ahora se descartaba,
 * igual que pasaba con `base` e `iva` por renglón. Los correos rediseñados la
 * muestran junto a la tasa, y la fecha del pedido no sirve de sustituto: la
 * tasa publicada puede ser de meses antes.
 *
 * Sin backfill, a propósito: qué tasa estaba publicada cuando se creó un pedido
 * viejo no se puede reconstruir con certeza. Esas filas quedan en NULL y el
 * correo omite la fecha, mostrando sólo la tasa.
 */
export class AddExchangeRateDateToOrders1785490000000
  implements MigrationInterface
{
  name = 'AddExchangeRateDateToOrders1785490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "exchange_rate_date" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "exchange_rate_date"`,
    );
  }
}
```

- [ ] **Step 5: Asignarla al crear el pedido**

En `src/orders/orders.service.ts`, en `createOrder`, junto a las demás asignaciones del objeto `order`. Buscar la línea `order.exchangeRate = pricing.exchangeRate;` y agregar inmediatamente debajo:

```typescript
    order.exchangeRateDate = pricing.rateDate;
```

- [ ] **Step 6: Correr la migración y las pruebas**

Run: `yarn migration:run`
Expected: aplica `AddExchangeRateDateToOrders1785490000000`.

Verificar: `psql -h localhost -U postgres -d construir_db -c "\d orders"` muestra `exchange_rate_date` de tipo `date`, nullable.

Run: `npx jest src/orders/orders.service.createOrder.rateDate.spec.ts src/orders/orders.service.createOrder.ivaBreakdown.spec.ts`
Expected: PASS ambas.

- [ ] **Step 7: Commit**

```bash
git add src/orders/order.entity.ts src/database/migrations/1785490000000-AddExchangeRateDateToOrders.ts src/orders/orders.service.ts src/orders/orders.service.createOrder.rateDate.spec.ts
git commit -m "feat(orders): guardar la fecha de la tasa con la que se facturó el pedido"
```

---

### Task 4: Dejar de notificar las cancelaciones

El handoff descarta esas plantillas porque las cancelaciones las atiende un vendedor por WhatsApp. Hay que quitar el código **antes** de borrar los archivos: `loadTemplate` hace `readFileSync` sin guarda, y esos envíos ocurren después de devolver inventario y guardar la orden.

**Files:**
- Modify: `src/email/email.service.ts` (eliminar `sendOrderCanceled`, `sendAdminOrderCancelled`, `sendOrderDelivered`)
- Delete: `src/email/templates/order-canceled.hbs`, `admin-order-cancelled.hbs`, `order-delivered.hbs`
- Modify: `src/orders/orders.service.ts` (cuatro llamadas)
- Modify: `src/orders/orders.service.cancelPendingOrder.spec.ts`, `src/orders/orders.service.cancelOrder.spec.ts`

**Interfaces:**
- Produces: `EmailService` deja de exponer `sendOrderCanceled`, `sendAdminOrderCancelled` y `sendOrderDelivered`.

- [ ] **Step 1: Quitar las llamadas del servicio de pedidos**

En `src/orders/orders.service.ts` hay cuatro llamadas, en `cancelOrder` (~línea 1022) y en `cancelPendingOrder` (~línea 1647). Verificar la ubicación real con:

```bash
grep -n "sendOrderCanceled\|sendAdminOrderCancelled" src/orders/orders.service.ts
```

En **ambos** métodos, eliminar este par de líneas:

```typescript
    await this.emailService.sendOrderCanceled(fullOrder);
    await this.emailService.sendAdminOrderCancelled(fullOrder);
```

Si al quitarlas la variable `fullOrder` queda sin uso, eliminar también su `const fullOrder = await this.findOneByUuid(...)` — pero **sólo si de verdad no se usa después**; en `cancelPendingOrder` el valor de retorno es `cancelledOrder`, no `fullOrder`. Comprobarlo con `npx tsc --noEmit`, que reporta las variables sin usar.

Dejar en su lugar un comentario que explique la ausencia:

```typescript
    // Las cancelaciones no se notifican por correo: las atiende un vendedor por
    // WhatsApp, que es lo que el cliente necesita cuando su pedido se cae.
```

- [ ] **Step 2: Eliminar los métodos del servicio de correo**

En `src/email/email.service.ts`, eliminar los tres métodos completos: `sendOrderCanceled` (~línea 284), `sendAdminOrderCancelled` (~línea 348) y `sendOrderDelivered` (~línea 255). `sendOrderDelivered` no tenía ningún consumidor.

- [ ] **Step 3: Borrar las plantillas**

```bash
git rm src/email/templates/order-canceled.hbs \
       src/email/templates/admin-order-cancelled.hbs \
       src/email/templates/order-delivered.hbs
```

- [ ] **Step 4: Actualizar los specs que las esperaban**

`src/orders/orders.service.cancelPendingOrder.spec.ts` mockea `emailService` con `sendOrderCanceled` y `sendAdminOrderCancelled`, y tiene una prueba que afirma que se llaman. Reemplazar el mock por `const emailService = {};` y sustituir esa prueba por:

```typescript
  // Las cancelaciones ya no se notifican por correo. La prueba importa porque
  // este método devuelve inventario y guarda la orden ANTES de donde estaba el
  // envío: si quedara una llamada a una plantilla borrada, `readFileSync`
  // reventaría sobre una anulación que ya se aplicó.
  it('anula sin intentar enviar ningún correo', async () => {
    const order = makeOrder();
    const savedOrder = { ...order, status: OrderStatus.CANCELLED, dateCompleted };

    orderRepo.findOne.mockResolvedValueOnce(order).mockResolvedValueOnce(savedOrder);
    orderRepo.save.mockResolvedValue(savedOrder);

    await expect(
      service.cancelPendingOrder(100, dateCompleted),
    ).resolves.not.toThrow();

    expect(productRepo.increment).toHaveBeenCalledTimes(2);
  });
```

Revisar `src/orders/orders.service.cancelOrder.spec.ts` con `grep -n "sendOrderCanceled\|sendAdminOrderCancelled"` y quitar lo equivalente.

- [ ] **Step 5: Verificar que no queda ninguna referencia**

```bash
grep -rn "sendOrderCanceled\|sendAdminOrderCancelled\|sendOrderDelivered\|order-canceled\|admin-order-cancelled\|order-delivered" src/
```

Expected: sin resultados.

- [ ] **Step 6: Correr la suite**

Run: `npx tsc --noEmit && npx jest src/orders`
Expected: `tsc` limpio y todos los specs de pedidos en verde.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(email): dejar de notificar las cancelaciones por correo"
```

---

### Task 5: Incorporar las plantillas y registrar los parciales

Las plantillas nuevas usan parciales y el helper `concat`, que hoy no existen. Sin registrarlos, `handlebars.compile` falla en cuanto encuentra un `{{> header}}`.

**Files:**
- Create: `src/email/templates/partials/header.hbs`, `partials/footer.hbs`
- Replace: los 7 `.hbs` rediseñados en `src/email/templates/`
- Create: `src/email/templates/payment-rejected.hbs`, `welcome.hbs`, `order-ready-for-pickup.hbs`
- Modify: `src/email/email.service.ts` (constructor)

**Interfaces:**
- Produces: `EmailService` registra los parciales de `templates/partials/` y el helper `concat` al construirse.

- [ ] **Step 1: Copiar las plantillas del handoff**

```bash
D=$(mktemp -d)
unzip -q ~/Downloads/"Pantallas storefront construir-fe.zip" -d "$D"
mkdir -p src/email/templates/partials
cp "$D"/email-templates/partials/*.hbs src/email/templates/partials/
cp "$D"/email-templates/*.hbs src/email/templates/
rm -rf "$D"
ls src/email/templates src/email/templates/partials
```

Debe quedar: los 10 `.hbs` en `templates/` y `header.hbs` + `footer.hbs` en `templates/partials/`.

- [ ] **Step 2: Hacer condicional el monto reportado**

En `src/email/templates/payment-rejected.hbs`, el renglón «lo que reportaste» imprime `Bs. {{reportedAmountVes}}` sin condicional, pero ese dato no se recoge en ninguna parte: al rechazar un pago el admin sólo puede dejar `adminNotes`.

Localizar la fila con `grep -n "reportedAmountVes" src/email/templates/payment-rejected.hbs` y envolver **el `<tr>` completo** que la contiene en:

```handlebars
{{#if reportedAmountVes}}
  ...el <tr> tal como está...
{{/if}}
```

Es la única desviación respecto del handoff recibido.

- [ ] **Step 3: Comprobar que el build copia los parciales**

`nest-cli.json` copia los `.hbs` a `dist/`. Verificar que el patrón alcanza al subdirectorio:

```bash
grep -A 8 '"assets"' nest-cli.json
yarn build
ls dist/src/email/templates/partials/
```

Expected: `header.hbs` y `footer.hbs` presentes en `dist`. Si no aparecen, el patrón de `assets` en `nest-cli.json` necesita `"**/*.hbs"` en vez de `"*.hbs"`.

- [ ] **Step 4: Registrar parciales y helper en el constructor**

En `src/email/email.service.ts`, dentro del `constructor`, después de crear el `transporter`, agregar `this.registerTemplateHelpers();` y añadir este método privado justo después del constructor:

```typescript
  /**
   * Registra los parciales y el helper que usan las plantillas.
   *
   * Va en el constructor y no en cada envío: `registerPartial` es global de
   * Handlebars, y hacerlo por correo relee del disco en cada envío sin ninguna
   * ganancia.
   *
   * `concat` es el único helper que las plantillas necesitan — lo usan para
   * armar textos como `eyebrow="Pedido {{orderNumber}}"`. Handlebars pasa su
   * propio objeto de opciones como último argumento, por eso se descarta.
   */
  private registerTemplateHelpers(): void {
    const dir = path.join(__dirname, 'templates', 'partials');

    for (const file of fs.readdirSync(dir)) {
      handlebars.registerPartial(
        path.basename(file, '.hbs'),
        fs.readFileSync(path.join(dir, file), 'utf-8'),
      );
    }

    handlebars.registerHelper('concat', (...args: unknown[]) =>
      args.slice(0, -1).join(''),
    );
  }
```

- [ ] **Step 5: Que una plantilla ausente no tumbe la operación**

`sendEmail` ya traga sus errores, pero `loadTemplate` hace `readFileSync` sin
guarda y corre **antes**. Varios envíos ocurren después de escrituras
irreversibles —`cancelPendingOrder` devuelve inventario y guarda la orden antes
de notificar—, así que un archivo faltante o un `{{#if}}` mal cerrado tumbaría
una operación que ya se aplicó.

En `src/email/email.service.ts`, agregar este método privado junto a
`loadTemplate`:

```typescript
  /**
   * Compone el HTML de una plantilla, o `null` si algo falla.
   *
   * Un correo es una notificación, no parte de la transacción: varios envíos
   * ocurren después de escrituras que ya no se pueden deshacer. Una plantilla
   * que falta o que no compila tiene que quedar en el log, no propagar hacia
   * una anulación que ya devolvió inventario.
   */
  private async render(
    templateName: string,
    payload: Record<string, unknown>,
  ): Promise<string | null> {
    try {
      const source = await this.loadTemplate(templateName);
      return handlebars.compile(source)(payload);
    } catch (error) {
      this.logger.error(
        `No se pudo componer la plantilla "${templateName}": ${error}`,
      );
      return null;
    }
  }
```

Los métodos de envío pasan a usarlo:

```typescript
    const html = await this.render('order-confirmation', { ...payload });
    if (!html) return;
```

Aplicarlo en los nueve métodos de envío a medida que se tocan en los Tasks 6
y 7; en este paso basta con dejar el helper escrito y que `tsc` pase.

- [ ] **Step 6: Verificar que las plantillas compilan**

Crear `src/email/templates.spec.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

const DIR = path.join(__dirname, 'templates');

/**
 * No comprueba el contenido: sólo que cada plantilla sea Handlebars válido y
 * que sus parciales existan. Las pruebas de payload, una por correo, verifican
 * después que no falte ninguna variable.
 */
describe('plantillas de correo', () => {
  beforeAll(() => {
    const partials = path.join(DIR, 'partials');
    for (const file of fs.readdirSync(partials)) {
      handlebars.registerPartial(
        path.basename(file, '.hbs'),
        fs.readFileSync(path.join(partials, file), 'utf-8'),
      );
    }
    handlebars.registerHelper('concat', (...args: unknown[]) =>
      args.slice(0, -1).join(''),
    );
  });

  const plantillas = fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith('.hbs'));

  it('están todas las que el servicio espera', () => {
    expect(plantillas.sort()).toEqual([
      'admin-new-order.hbs',
      'email-verification.hbs',
      'invitation.hbs',
      'order-confirmation.hbs',
      'order-ready-for-pickup.hbs',
      'order-shipped.hbs',
      'password-reset.hbs',
      'payment-confirmed.hbs',
      'payment-rejected.hbs',
      'welcome.hbs',
    ]);
  });

  it.each(
    fs.readdirSync(DIR).filter((f) => f.endsWith('.hbs')),
  )('%s compila', (archivo) => {
    const fuente = fs.readFileSync(path.join(DIR, archivo), 'utf-8');

    expect(() => handlebars.compile(fuente)).not.toThrow();
  });
});
```

Run: `npx jest src/email/templates.spec.ts`
Expected: PASS, 11 casos.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(email): incorporar las plantillas rediseñadas y registrar los parciales"
```

---

### Task 6: Adaptar los envíos de pedido al payload nuevo

Los cuatro correos que hablan de un pedido son los que más cambian: pasan a bolívar protagonista, tasa con fecha, y enlace de seguimiento.

**Files:**
- Modify: `src/email/email.service.ts` (`sendOrderConfirmation`, `sendPaymentConfirmed`, `sendOrderShipped`, `sendAdminNewOrder`)
- Test: `src/email/email.service.payload.spec.ts`

**Interfaces:**
- Consumes: `formatVes` de `./money.util`; `EmailPayloadBuilder` de `./payload.builder`.
- Produces: `sendOrderShipped(order: Order): Promise<void>` — sin `trackingNumber`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/email/email.service.payload.spec.ts`. Estas pruebas compilan cada plantilla **en modo estricto** con el payload que arma su método: en modo estricto Handlebars lanza ante una variable ausente, que es justo el fallo que se busca.

Se espía `sendEmail` para capturar el HTML sin mandar nada.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailPayloadBuilder } from './payload.builder';
import { Order, OrderStatus, DeliveryMethod } from '../orders/order.entity';
import { PaymentMethod, PaymentStatus } from '../orders/payment-info.entity';

const CONFIG: Record<string, string> = {
  'app.frontendUrl': 'https://constru-ir.com',
  'app.url': 'https://api.constru-ir.com',
  'app.storeName': 'Construir',
  'app.storeAddress': 'Av. Bolívar 123',
  'app.storeCity': 'Ciudad Bolívar',
  'app.storeHours': 'Lunes a Viernes 8-5',
  'app.storePhone': '+58 285 632 0178',
  'app.storeEmail': 'info@constru-ir.com',
  'app.storeMapUrl': 'https://maps.example/1',
  'app.storeWhatsappUrl': 'https://wa.me/584120000000',
  'app.storeRif': 'J-12345678-9',
  'email.from': '"Construir" <no-reply@constru-ir.com>',
  'email.adminNotificationEmail': 'admin@constru-ir.com',
};

const makeOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 35,
    orderNumber: 'ORD-MS92XZW4-ASXE',
    status: OrderStatus.ON_HOLD,
    deliveryMethod: DeliveryMethod.PICKUP,
    createdAt: new Date('2026-07-31T15:10:56.000Z'),
    subtotal: 65.0,
    tax: 10.4,
    shipping: 0,
    discountAmount: 0,
    discountCode: null,
    total: 75.4,
    exchangeRate: 481.22,
    exchangeRateDate: '2026-04-19',
    subtotalVes: 31279.3,
    taxVes: 5004.69,
    discountAmountVes: null,
    totalVes: 36283.99,
    guestEmail: 'carlosvas@gmail.com',
    user: null,
    guestCustomer: null,
    shippingAddress: null,
    paymentInfo: {
      method: PaymentMethod.PAGOMOVIL,
      status: PaymentStatus.PENDING,
      referenceCode: '998877',
    },
    items: [
      {
        productName: 'TIJERA PODAR MEDIAN 3501-240',
        productSku: '29346',
        quantity: 1,
        price: 27.84,
        priceVes: 13396.16,
        subtotal: 27.84,
        subtotalVes: 13396.16,
        base: 24.0,
        iva: 3.84,
        product: { ivaType: 0 },
      },
    ],
    ...overrides,
  }) as unknown as Order;

describe('EmailService — payload de las plantillas', () => {
  let service: EmailService;
  let enviados: { to: string; subject: string; html: string }[];

  beforeEach(async () => {
    enviados = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        EmailPayloadBuilder,
        {
          provide: ConfigService,
          useValue: { get: (clave: string) => CONFIG[clave] },
        },
      ],
    }).compile();

    service = module.get(EmailService);

    // Se intercepta el envío: interesa el HTML, no el SMTP.
    jest
      .spyOn(service as never, 'sendEmail')
      .mockImplementation(async (to, subject, html) => {
        enviados.push({ to, subject, html } as never);
      });
  });

  const noQuedanHuecos = (html: string) => {
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('[object Object]');
  };

  it('sendOrderConfirmation compone la plantilla sin huecos', async () => {
    await service.sendOrderConfirmation(makeOrder());

    expect(enviados).toHaveLength(1);
    expect(enviados[0].to).toBe('carlosvas@gmail.com');
    expect(enviados[0].subject).toBeTruthy();
    noQuedanHuecos(enviados[0].html);
  });

  it('muestra el bolívar como protagonista y el dólar de referencia', async () => {
    await service.sendOrderConfirmation(makeOrder());

    const html = enviados[0].html;
    expect(html).toContain('36.283,99');
    expect(html).toContain('75.40');
  });

  it('muestra la tasa con su fecha, no con la del pedido', async () => {
    await service.sendOrderConfirmation(makeOrder());

    expect(enviados[0].html).toContain('481,22');
  });

  // Un pedido facturado sin tasa disponible no tiene montos en bolívares.
  it('no imprime bloques vacíos cuando no hubo tasa', async () => {
    await service.sendOrderConfirmation(
      makeOrder({
        exchangeRate: null,
        exchangeRateDate: null,
        subtotalVes: null,
        taxVes: null,
        totalVes: null,
      }),
    );

    const html = enviados[0].html;
    expect(html).not.toContain('Bs. null');
    expect(html).not.toContain('Bs. ,');
    noQuedanHuecos(html);
  });

  it('incluye el enlace de seguimiento del pedido', async () => {
    await service.sendOrderConfirmation(makeOrder());

    expect(enviados[0].html).toContain(
      'https://constru-ir.com/seguimiento/ORD-MS92XZW4-ASXE',
    );
  });

  it('sendPaymentConfirmed compone la plantilla sin huecos', async () => {
    await service.sendPaymentConfirmed(makeOrder());

    expect(enviados).toHaveLength(1);
    noQuedanHuecos(enviados[0].html);
  });

  it('sendOrderShipped compone la plantilla sin huecos', async () => {
    await service.sendOrderShipped(makeOrder());

    expect(enviados).toHaveLength(1);
    noQuedanHuecos(enviados[0].html);
  });

  it('sendAdminNewOrder va al correo del admin y no al del cliente', async () => {
    await service.sendAdminNewOrder(makeOrder());

    expect(enviados).toHaveLength(1);
    expect(enviados[0].to).toBe('admin@constru-ir.com');
    noQuedanHuecos(enviados[0].html);
  });
});
```

- [ ] **Step 2: Correr y ver qué falta**

Run: `npx jest src/email/email.service.payload.spec.ts`
Expected: FAIL. Los mensajes indican qué variables no llegan.

- [ ] **Step 3: Adaptar los cuatro métodos**

En `src/email/email.service.ts`, inyectar el constructor del payload:

```typescript
  constructor(
    private configService: ConfigService,
    private readonly payloads: EmailPayloadBuilder,
  ) {
```

y los imports:

```typescript
import { EmailPayloadBuilder } from './payload.builder';
import { formatVes } from './money.util';
```

En cada uno de los cuatro métodos, componer el bloque común con lo propio. Para `sendOrderConfirmation`, el objeto que se pasa a `template(...)` incorpora:

```typescript
      ...this.payloads.buildCommon(),
      subject: `Recibimos tu pedido ${order.orderNumber}`,
      preheader: `Estamos verificando tu pago · Bs. ${formatVes(order.totalVes) ?? ''}`,
      trackingUrl: this.payloads.trackingUrl(order.orderNumber),
      exchangeRate: order.exchangeRate ? formatVes(order.exchangeRate) : null,
      exchangeRateDate: order.exchangeRateDate,
      totalVes: formatVes(order.totalVes),
      subtotalVes: formatVes(order.subtotalVes),
      taxVes: formatVes(order.taxVes),
      discountAmountVes: formatVes(order.discountAmountVes),
      paymentReference: order.paymentInfo?.referenceCode ?? null,
      verificationSla: '24 horas hábiles',
```

y cada renglón de `items` incorpora:

```typescript
        priceVes: formatVes(item.priceVes),
        lineAmountVes: formatVes(item.subtotalVes),
```

`itemsGrossTotalVes` se calcula como ya se hace en USD, sumando `Number(item.priceVes) * item.quantity` sobre los renglones y pasándolo por `formatVes`.

Los otros tres métodos siguen el mismo patrón. Sus campos, extraídos de las
plantillas del handoff — no hay que deducirlos:

**`sendPaymentConfirmed`** (`payment-confirmed.hbs`)

| Campo | De dónde |
|---|---|
| `subject` | `Confirmamos tu pago del pedido ${order.orderNumber}` |
| `preheader` | `Tu pedido pasa a preparación` |
| `customerName`, `total` | como ya los arma hoy |
| `totalVes` | `formatVes(order.totalVes)` |
| `exchangeRate` | `formatVes(order.exchangeRate)` |
| `paymentMethod` | `this.translatePaymentMethod(order.paymentInfo.method)` |
| `paymentReference` | `order.paymentInfo?.referenceCode ?? null` |
| `verifiedAt` | `order.paymentInfo?.verifiedAt` formateado en `es-VE`, o `null` |
| `estimatedDelivery` | `null` — no se calcula en ninguna parte; la plantilla lo oculta |
| `trackingUrl` | `this.payloads.trackingUrl(order.orderNumber)` |

**`sendOrderShipped`** (`order-shipped.hbs`)

| Campo | De dónde |
|---|---|
| `subject` | `Tu pedido ${order.orderNumber} va en camino` |
| `preheader` | `Coordinamos la entrega contigo por WhatsApp` |
| `customerName` | como ya lo arma hoy |
| `shippingAddress` | `order.shippingAddress` tal cual: la plantilla lee sus campos |
| `trackingUrl` | `this.payloads.trackingUrl(order.orderNumber)` |

**`sendAdminNewOrder`** (`admin-new-order.hbs`)

| Campo | De dónde |
|---|---|
| `subject` | `Pedido nuevo ${order.orderNumber}` |
| `preheader` | `${itemCount} artículos · Bs. ${formatVes(order.totalVes) ?? ''}` |
| `customerName`, `customerEmail`, `orderDate`, `adminUrl` | como ya los arma hoy |
| `orderNumber`, `total` | como ya los arma hoy |
| `totalVes` | `formatVes(order.totalVes)` |
| `exchangeRate` | `formatVes(order.exchangeRate)` |
| `itemCount` | `order.items.length` |
| `deliveryMethod` | `order.deliveryMethod === 'pickup' ? 'Retiro en tienda' : 'Delivery'` |
| `paymentMethod` | `this.translatePaymentMethod(order.paymentInfo.method)` |

`estimatedDelivery` va en `null` a propósito: no existe cálculo de fecha estimada
en el sistema, y la plantilla envuelve ese bloque en un `{{#if}}`.

**`sendOrderShipped` pierde el parámetro `trackingNumber`:** la firma pasa a `sendOrderShipped(order: Order)`. Nadie lo llama hoy, así que no hay consumidores que actualizar — confirmarlo con `grep -rn "sendOrderShipped(" src/`.

- [ ] **Step 4: Correr hasta que pasen**

Run: `npx jest src/email/email.service.payload.spec.ts`
Expected: PASS, 8 casos.

- [ ] **Step 5: Commit**

```bash
git add src/email/email.service.ts src/email/email.service.payload.spec.ts
git commit -m "feat(email): montos en bolívares y enlace de seguimiento en los correos de pedido"
```

---

### Task 7: Adaptar los correos de cuenta y agregar los dos disparadores

**Files:**
- Modify: `src/email/email.service.ts` (`sendEmailVerification`, `sendPasswordReset`, `sendInvitationEmail`; agregar `sendPaymentRejected` y `sendWelcome`)
- Modify: `src/orders/orders.service.ts` (`updateOrderStatus`)
- Modify: `src/users/users.service.ts` (`verifyEmail`)
- Test: `src/email/email.service.cuenta.spec.ts`, `src/orders/orders.service.paymentRejected.spec.ts`

**Interfaces:**
- Produces:
  - `sendPaymentRejected(order: Order): Promise<void>`
  - `sendWelcome(params: { to: string; firstName: string }): Promise<void>`

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/email/email.service.cuenta.spec.ts`, con el mismo bloque de `Test.createTestingModule` y el mismo espía de `sendEmail` que `email.service.payload.spec.ts` del Task 6 (repetir la constante `CONFIG` y el `beforeEach`), y estas pruebas:

```typescript
  it('sendPasswordReset incluye el correo y el enlace', async () => {
    await service.sendPasswordReset({
      to: 'ana@example.com',
      firstName: 'Ana',
      resetUrl: 'https://constru-ir.com/reset-password?token=abc',
      storeName: 'Construir',
    });

    const html = enviados[0].html;
    expect(html).toContain('https://constru-ir.com/reset-password?token=abc');
    expect(html).toContain('ana@example.com');
    noQuedanHuecos(html);
  });

  it('sendEmailVerification compone la plantilla sin huecos', async () => {
    await service.sendEmailVerification({
      to: 'ana@example.com',
      firstName: 'Ana',
      verificationUrl: 'https://constru-ir.com/verify-email?token=abc',
      storeName: 'Construir',
    });

    noQuedanHuecos(enviados[0].html);
  });

  it('sendWelcome compone la plantilla sin huecos', async () => {
    await service.sendWelcome({ to: 'ana@example.com', firstName: 'Ana' });

    expect(enviados[0].to).toBe('ana@example.com');
    noQuedanHuecos(enviados[0].html);
  });

  it('sendPaymentRejected compone la plantilla sin huecos', async () => {
    await service.sendPaymentRejected(makeOrder());

    noQuedanHuecos(enviados[0].html);
  });

  // El dato no se recoge en ninguna parte, así que ese renglón no debe pintarse.
  it('sendPaymentRejected omite el monto reportado, que no se recoge', async () => {
    await service.sendPaymentRejected(makeOrder());

    expect(enviados[0].html).not.toContain('Bs. </td>');
  });
```

Reutilizar el `makeOrder` del Task 6 copiándolo en este archivo.

- [ ] **Step 2: Correr y verificar que fallan**

Run: `npx jest src/email/email.service.cuenta.spec.ts`
Expected: FAIL — `service.sendWelcome is not a function`.

- [ ] **Step 3: Adaptar los tres métodos existentes y escribir los dos nuevos**

`sendEmailVerification`, `sendPasswordReset` y `sendInvitationEmail` incorporan `...this.payloads.buildCommon()`, su `subject` y su `preheader`. `sendPasswordReset` además pasa `email: params.to`, que la plantilla muestra para que el cliente sepa a qué cuenta corresponde el enlace.

`sendInvitationEmail` necesita cuatro campos que hoy no arma:

- `expiresAtFormatted` — la fecha de expiración que ya recibe, en `es-VE`:
  `new Date(params.expiresAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })`
- `invitedByName` — el nombre de quien invita. Si el método no lo recibe hoy,
  agregarlo al objeto de parámetros y pasarlo desde `InvitationsService`.
- `roleLabel` — el rol en español, con este mapa junto a `translateStatus`:

```typescript
  private roleLabel(role: string): string {
    const etiquetas: Record<string, string> = {
      admin: 'Administrador',
      order_admin: 'Gestor de pedidos',
      customer: 'Cliente',
      user: 'Cliente',
    };
    return etiquetas[role] ?? role;
  }
```

- `permissions: [{ text, denied }]` — qué puede y qué no puede hacer ese rol.
  Se deriva del rol con este mapa, en el mismo método:

```typescript
  private permissionsFor(role: string): { text: string; denied?: boolean }[] {
    if (role === 'admin') {
      return [
        { text: 'Gestionar productos y categorías' },
        { text: 'Gestionar pedidos y verificar pagos' },
        { text: 'Invitar y administrar usuarios' },
      ];
    }

    return [
      { text: 'Ver y gestionar pedidos' },
      { text: 'Verificar pagos' },
      { text: 'Gestionar productos', denied: true },
      { text: 'Administrar usuarios', denied: true },
    ];
  }
```

Los dos métodos nuevos:

```typescript
  /**
   * Aviso de que el pago no se pudo verificar.
   *
   * `reportedAmountVes` —lo que el cliente dijo haber pagado— no se recoge en
   * ninguna parte: al rechazar, el admin sólo puede dejar `adminNotes`. Se pasa
   * `null` y la plantilla omite ese renglón.
   */
  async sendPaymentRejected(order: Order): Promise<void> {
    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) return;

    const templateSource = await this.loadTemplate('payment-rejected');
    const template = handlebars.compile(templateSource);

    const html = template({
      ...this.payloads.buildCommon(),
      subject: `No pudimos verificar tu pago del pedido ${order.orderNumber}`,
      preheader: 'Escríbenos y lo revisamos contigo',
      customerName: this.customerName(order),
      paymentReference: order.paymentInfo?.referenceCode ?? null,
      totalVes: formatVes(order.totalVes),
      reportedAmountVes: null,
      differenceVes: null,
      reservedUntil: null,
    });

    await this.sendEmail(recipientEmail, `No pudimos verificar tu pago del pedido ${order.orderNumber}`, html);
  }

  /** Se envía cuando la cuenta queda utilizable, es decir tras verificar el correo. */
  async sendWelcome(params: { to: string; firstName: string }): Promise<void> {
    const templateSource = await this.loadTemplate('welcome');
    const template = handlebars.compile(templateSource);

    const comun = this.payloads.buildCommon();

    const html = template({
      ...comun,
      subject: `Tu cuenta en ${comun.store.name} ya está lista`,
      preheader: 'Ya puedes seguir tus pedidos desde tu cuenta',
      firstName: params.firstName,
      catalogUrl: `${this.configService.get('app.frontendUrl')}/productos`,
    });

    await this.sendEmail(params.to, `Tu cuenta en ${comun.store.name} ya está lista`, html);
  }
```

Si no existe un `customerName(order)` privado, extraerlo del que `sendOrderConfirmation` ya calcula en línea.

- [ ] **Step 4: Cablear el disparador del pago rechazado**

En `src/orders/orders.service.ts`, en `updateOrderStatus`, junto a la rama que ya existe para el pago verificado (~línea 890):

```typescript
    // Simétrico al aviso de pago verificado: hasta ahora el rechazo no
    // notificaba nada y el cliente se quedaba esperando sin saber por qué.
    if (
      previousPaymentStatus !== PaymentStatus.REJECTED &&
      order.paymentInfo.status === PaymentStatus.REJECTED
    ) {
      await this.emailService.sendPaymentRejected(updatedOrder);
    }
```

- [ ] **Step 5: Cablear el correo de bienvenida**

En `src/users/users.service.ts`, al final de `verifyEmail`, después de guardar el usuario:

```typescript
    // La cuenta recién queda utilizable acá: hasta verificar, el login la
    // rechaza. Se envía sin await ni propagar, igual que la verificación.
    this.emailService
      .sendWelcome({ to: user.email, firstName: user.firstName })
      .catch((err) => console.error('Error sending welcome email:', err));
```

- [ ] **Step 6: Escribir la prueba del disparador**

Crear `src/orders/orders.service.paymentRejected.spec.ts`, con el bloque de providers de `src/orders/orders.service.acknowledgeOrder.spec.ts` (incluido el de `UsersService`) pero con `emailService` como `{ sendPaymentConfirmed: jest.fn(), sendPaymentRejected: jest.fn() }`:

```typescript
  it('avisa al cliente cuando el pago pasa a rechazado', async () => {
    const order = makeOrder({
      paymentInfo: { status: PaymentStatus.PENDING } as PaymentInfo,
    });
    const actualizada = {
      ...order,
      paymentInfo: { status: PaymentStatus.REJECTED },
    };

    orderRepo.findOne.mockResolvedValueOnce(order).mockResolvedValueOnce(actualizada);
    orderRepo.save.mockResolvedValue(actualizada);

    await service.updateOrderStatus('order-uuid-100', {
      paymentStatus: PaymentStatus.REJECTED,
    } as UpdateOrderStatusDto);

    expect(emailService.sendPaymentRejected).toHaveBeenCalledWith(actualizada);
  });

  it('no reenvía el aviso si el pago ya estaba rechazado', async () => {
    const order = makeOrder({
      paymentInfo: { status: PaymentStatus.REJECTED } as PaymentInfo,
    });

    orderRepo.findOne.mockResolvedValueOnce(order).mockResolvedValueOnce(order);
    orderRepo.save.mockResolvedValue(order);

    await service.updateOrderStatus('order-uuid-100', {
      paymentStatus: PaymentStatus.REJECTED,
    } as UpdateOrderStatusDto);

    expect(emailService.sendPaymentRejected).not.toHaveBeenCalled();
  });
```

- [ ] **Step 7: Correr las pruebas**

Run: `npx jest src/email src/orders/orders.service.paymentRejected.spec.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(email): correos de cuenta rediseñados, aviso de pago rechazado y bienvenida"
```

---

### Task 8: Cierre — suite completa y documentación

**Files:**
- Modify: `docs/pruebas-preproduccion.md`
- Modify: `docs/guion-pruebas-produccion.md`

- [ ] **Step 1: Correr todo**

Run: `npx tsc --noEmit && npx jest && npx eslint src/email`
Expected: `tsc` limpio, toda la suite en verde, y sin errores nuevos de eslint en `src/email` (el repo arrastra algunos preexistentes en otros archivos; comprobar con `git stash` si hay duda).

- [ ] **Step 2: Anotar el estado de las plantillas**

Al final de `docs/pruebas-preproduccion.md`:

```markdown
---

## Plantillas de correo · estado tras el rediseño

Adoptado el handoff de `email-templates/`. Tres cosas quedan pendientes de
producto, anotadas para que no se pierdan:

- **`order-ready-for-pickup.hbs` y `order-shipped.hbs` no tienen disparador.**
  No existe un estado «liste para retirar» ni uno «enviado»: el ciclo lo mueve
  el ERP entre `on-hold`, `pending`, `completed` y `cancelled`. Las plantillas
  están incorporadas y sus pruebas de compilación corren, así que no se van a
  romper en silencio, pero nadie las envía.
- **`reportedAmountVes` no se recoge.** Al rechazar un pago el admin sólo puede
  dejar `adminNotes`, no el monto que el cliente dijo haber pagado. Ese renglón
  de `payment-rejected` está envuelto en un condicional y no se muestra.
- **Las cancelaciones ya no se notifican por correo.** Las atiende un vendedor
  por WhatsApp. El admin tampoco recibe aviso de las anulaciones que dispara el
  ERP: si eso hace falta, hay que reponerlo a propósito.
```

- [ ] **Step 3: Agregar la comprobación de correos al guion de producción**

En `docs/guion-pruebas-produccion.md`, dentro de «Antes de empezar», después del punto sobre `ADMIN_NOTIFICATION_EMAIL`:

```markdown
**2.b Las plantillas nuevas necesitan dos variables más:**

```bash
grep -E "STORE_WHATSAPP_URL|STORE_RIF" .env
```

Sin ellas los correos salen sin el enlace de contacto y sin el RIF, ocultando
esos bloques. No fallan, pero pierden información que el cliente espera.
```

Y al final del Flujo A, después del paso A7:

```markdown
### A8 · Los correos

Abrir en el móvil los que llegaron: confirmación del pedido y aviso al admin.

**Debe pasar:** los montos se ven con Bs. de protagonista y el USD debajo, la
tasa aparece con su fecha, los renglones se ven como filas y no apilados, y el
enlace de seguimiento abre el pedido.

Conviene mirarlos en Outlook además del cliente habitual: es el que rompía la
maquetación anterior, y la razón de todo el rediseño.
```

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs(email): anotar lo que queda pendiente tras el rediseño de las plantillas"
```

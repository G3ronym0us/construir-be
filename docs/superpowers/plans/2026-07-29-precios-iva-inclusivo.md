# Precios con IVA inclusivo — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el precio que el cliente ve en el catálogo sea el que paga, con el IVA desglosado (base + IVA = total) en el checkout, calculado por un único servicio en el backend.

**Architecture:** Un módulo puro (`iva.util.ts`) concentra toda la matemática del IVA. La derivación de los campos USD se mueve a hooks de la entidad `Product` para que no pueda desincronizarse. Un `OrderPricingService` nuevo calcula el desglose completo y lo consumen dos llamadores — el endpoint de previsualización `POST /orders/quote` y `createOrder` — de modo que el monto mostrado y el facturado no puedan divergir.

**Tech Stack:** NestJS 10, TypeORM 0.3 (PostgreSQL), Jest, class-validator / class-transformer.

**Spec:** `docs/superpowers/specs/2026-07-29-precios-iva-inclusivo-design.md`

## Global Constraints

- **`synchronize: false` es obligatorio.** Todo cambio de esquema va en una migración explícita generada con `yarn migration:create`. Nunca editar el esquema por otra vía.
- **Redondeo monetario:** siempre 2 decimales, y **nunca se redondean los tres miembros de un desglose por separado** — se redondean dos y el tercero sale por resta, para que `base + iva === total` sea exacto.
- **Las columnas `decimal` de TypeORM/Postgres vuelven como `string`.** Todo valor leído de una entidad se envuelve en `Number(...)` antes de operar.
- **Alícuotas:** `IvaType.NORMAL = 0` → 16%, `EXENTO = 1` → 0%, `REDUCIDO = 2` → 8%, `LUJO = 3` → 24% (`src/products/enums/iva-type.enum.ts`).
- **Cuidado con `IvaType.NORMAL === 0`:** `IVA_RATES[undefined] ?? 0` da 0 y trataría el producto como exento por error. Todo acceso usa `ivaType ?? IvaType.NORMAL`.
- **Los hooks `@BeforeUpdate` de TypeORM no disparan con `repository.update()` ni con query builders.** Todo código que modifique `price` o `ivaType` debe usar `.save()`.
- **El descuento opera sobre el monto inclusivo** (`itemsTotal`), no sobre la base.
- **`shipping` queda en 0** — fuera de alcance, se mantiene el TODO existente.
- **El contrato v1 del ERP no se toca** (`orders.service.ts` ~línea 1059 sigue emitiendo montos inclusivos).
- Comentarios y mensajes de commit en español, siguiendo el estilo del repo.
- Correr `yarn lint` antes de cada commit.

---

### Task 1: Módulo puro de matemática de IVA

**Files:**
- Create: `src/products/iva.util.ts`
- Test: `src/products/iva.util.spec.ts`

**Interfaces:**
- Consumes: `IvaType`, `IVA_RATES` de `src/products/enums/iva-type.enum.ts`
- Produces:
  - `interface IvaBreakdown { base: number; iva: number; total: number }`
  - `round2(value: number): number`
  - `fromBase(base: number, ivaType: IvaType): IvaBreakdown`
  - `fromTotal(total: number, ivaType: IvaType): IvaBreakdown`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/products/iva.util.spec.ts`:

```ts
import { IvaType } from './enums/iva-type.enum';
import { fromBase, fromTotal, round2 } from './iva.util';

describe('iva.util', () => {
  describe('round2', () => {
    it('redondea a 2 decimales sin el error binario de Math.round(v*100)/100', () => {
      // Math.round(1.005 * 100) / 100 devuelve 1 porque 1.005*100 = 100.49999999999999
      expect(round2(1.005)).toBe(1.01);
      expect(round2(2.675)).toBe(2.68);
      expect(round2(0)).toBe(0);
      expect(round2(10)).toBe(10);
    });
  });

  describe('fromBase', () => {
    it('deriva el IVA hacia adelante en las cuatro alícuotas', () => {
      expect(fromBase(10, IvaType.NORMAL)).toEqual({
        base: 10,
        iva: 1.6,
        total: 11.6,
      });
      expect(fromBase(10, IvaType.EXENTO)).toEqual({
        base: 10,
        iva: 0,
        total: 10,
      });
      expect(fromBase(10, IvaType.REDUCIDO)).toEqual({
        base: 10,
        iva: 0.8,
        total: 10.8,
      });
      expect(fromBase(10, IvaType.LUJO)).toEqual({
        base: 10,
        iva: 2.4,
        total: 12.4,
      });
    });

    it('trata un ivaType ausente como NORMAL, no como exento', () => {
      expect(fromBase(10, undefined as unknown as IvaType).iva).toBe(1.6);
    });
  });

  describe('fromTotal', () => {
    it('extrae la base y el IVA de un monto inclusivo', () => {
      expect(fromTotal(11.6, IvaType.NORMAL)).toEqual({
        base: 10,
        iva: 1.6,
        total: 11.6,
      });
      expect(fromTotal(20.88, IvaType.NORMAL)).toEqual({
        base: 18,
        iva: 2.88,
        total: 20.88,
      });
      expect(fromTotal(10, IvaType.EXENTO)).toEqual({
        base: 10,
        iva: 0,
        total: 10,
      });
    });

    it('no pierde el céntimo en montos mínimos', () => {
      const r = fromTotal(0.01, IvaType.NORMAL);
      expect(r.base + r.iva).toBe(0.01);
    });
  });

  describe('invariante base + iva === total', () => {
    const tipos = [
      IvaType.NORMAL,
      IvaType.EXENTO,
      IvaType.REDUCIDO,
      IvaType.LUJO,
    ];

    it('se cumple exacto en fromTotal para 5.000 montos × 4 alícuotas', () => {
      for (const tipo of tipos) {
        for (let centavos = 1; centavos <= 5000; centavos++) {
          const total = round2(centavos / 100);
          const r = fromTotal(total, tipo);
          expect(round2(r.base + r.iva)).toBe(total);
          expect(r.total).toBe(total);
        }
      }
    });

    it('se cumple exacto en fromBase para 5.000 montos × 4 alícuotas', () => {
      for (const tipo of tipos) {
        for (let centavos = 1; centavos <= 5000; centavos++) {
          const base = round2(centavos / 100);
          const r = fromBase(base, tipo);
          expect(round2(r.base + r.iva)).toBe(r.total);
          expect(r.base).toBe(base);
        }
      }
    });
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `yarn test -- --testPathPattern=iva.util`
Expected: FAIL — `Cannot find module './iva.util'`

- [ ] **Step 3: Implementar el módulo**

Crear `src/products/iva.util.ts`:

```ts
import { IvaType, IVA_RATES } from './enums/iva-type.enum';

export interface IvaBreakdown {
  /** Monto sin IVA. */
  base: number;
  /** Monto del IVA. */
  iva: number;
  /** Monto con IVA incluido. Siempre exactamente `base + iva`. */
  total: number;
}

/**
 * Redondeo monetario a 2 decimales.
 *
 * No usa `Math.round(v * 100) / 100` porque esa forma falla en los empates:
 * `1.005 * 100` da 100.49999999999999 en punto flotante y redondearía a 1.00
 * en vez de 1.01. Desplazar el punto decimal por notación exponencial sobre la
 * representación en texto evita el error, porque el parseo decimal no arrastra
 * el residuo binario de la multiplicación.
 */
export function round2(value: number): number {
  return Number(`${Math.round(Number(`${value}e2`))}e-2`);
}

function rateOf(ivaType: IvaType): number {
  // IvaType.NORMAL es 0, así que un ivaType ausente no puede resolverse con
  // `?? 0`: eso daría alícuota 0 (exento) en vez de 16%.
  return IVA_RATES[ivaType ?? IvaType.NORMAL] ?? IVA_RATES[IvaType.NORMAL];
}

/**
 * Deriva el desglose a partir de una base sin IVA.
 *
 * El total sale de sumar base + IVA ya redondeados, nunca de redondear el
 * producto por separado, para que la identidad `base + iva === total` se
 * cumpla exacto.
 */
export function fromBase(base: number, ivaType: IvaType): IvaBreakdown {
  const roundedBase = round2(base);
  const iva = round2(roundedBase * rateOf(ivaType));
  return { base: roundedBase, iva, total: round2(roundedBase + iva) };
}

/**
 * Extrae el desglose a partir de un monto que ya incluye IVA.
 *
 * El IVA sale por resta contra el total, no de redondear el producto, por la
 * misma razón que en `fromBase`.
 */
export function fromTotal(total: number, ivaType: IvaType): IvaBreakdown {
  const roundedTotal = round2(total);
  const base = round2(roundedTotal / (1 + rateOf(ivaType)));
  return { base, iva: round2(roundedTotal - base), total: roundedTotal };
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `yarn test -- --testPathPattern=iva.util`
Expected: PASS — todos los casos, incluidas las dos invariantes de 20.000 iteraciones.

- [ ] **Step 5: Lint y commit**

```bash
yarn lint
git add src/products/iva.util.ts src/products/iva.util.spec.ts
git commit -m "feat(products): módulo puro de matemática de IVA

Concentra en un solo lugar la derivación (fromBase) y la extracción
(fromTotal) del IVA, con la regla de redondeo que garantiza que
base + iva === total sea exacto: se redondean dos miembros y el tercero
sale por resta.

round2 evita el error binario de Math.round(v*100)/100 en los empates."
```

---

### Task 2: Derivación automática de los campos USD en `Product`

Cierra el defecto 2 del spec: `iva` y `price_with_iva` quedaban congelados porque nadie los recalculaba.

**Files:**
- Modify: `src/products/product.entity.ts` (imports, y nuevo método al final de la clase)
- Modify: `src/products/pricing.util.ts` (reescritura completa del cuerpo de `applyVesPrices`)
- Test: `src/products/product.entity.spec.ts` (crear)
- Test: `src/products/pricing.util.spec.ts` (crear)

**Interfaces:**
- Consumes: `fromBase`, `round2` de `src/products/iva.util.ts` (Task 1)
- Produces: `Product.syncUsdIvaFields(): void` — decorado con `@BeforeInsert()` y `@BeforeUpdate()`

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/products/product.entity.spec.ts`:

```ts
import { Product } from './product.entity';
import { IvaType } from './enums/iva-type.enum';

describe('Product.syncUsdIvaFields', () => {
  const build = (price: number, ivaType?: IvaType): Product => {
    const product = new Product();
    product.price = price;
    if (ivaType !== undefined) product.ivaType = ivaType;
    return product;
  };

  it('deriva iva y priceWithIva desde price y ivaType', () => {
    const product = build(10, IvaType.NORMAL);
    product.syncUsdIvaFields();
    expect(product.iva).toBe(1.6);
    expect(product.priceWithIva).toBe(11.6);
  });

  it('deja el IVA en cero para productos exentos', () => {
    const product = build(10, IvaType.EXENTO);
    product.syncUsdIvaFields();
    expect(product.iva).toBe(0);
    expect(product.priceWithIva).toBe(10);
  });

  it('sobreescribe valores congelados de una carga anterior', () => {
    const product = build(20, IvaType.NORMAL);
    product.iva = 1.6; // valor viejo, correspondía a price = 10
    product.priceWithIva = 11.6;
    product.syncUsdIvaFields();
    expect(product.iva).toBe(3.2);
    expect(product.priceWithIva).toBe(23.2);
  });

  it('trata price como string, tal como lo devuelve el driver de Postgres', () => {
    const product = new Product();
    product.price = '10.00' as unknown as number;
    product.ivaType = IvaType.NORMAL;
    product.syncUsdIvaFields();
    expect(product.priceWithIva).toBe(11.6);
  });

  it('asume NORMAL cuando ivaType no está definido, no exento', () => {
    const product = build(10);
    product.syncUsdIvaFields();
    expect(product.iva).toBe(1.6);
  });
});
```

Crear `src/products/pricing.util.spec.ts`:

```ts
import { Product } from './product.entity';
import { IvaType } from './enums/iva-type.enum';
import { applyVesPrices } from './pricing.util';

describe('applyVesPrices', () => {
  const build = (price: number, ivaType: IvaType): Product => {
    const product = new Product();
    product.price = price;
    product.ivaType = ivaType;
    return product;
  };

  it('calcula el IVA sobre la base en VES, no convirtiendo el IVA en USD', () => {
    const product = build(10, IvaType.NORMAL);
    applyVesPrices(product, 245.5);
    expect(product.priceVes).toBe(2455);
    expect(product.ivaVes).toBe(392.8);
    expect(product.priceWithIvaVes).toBe(2847.8);
  });

  it('mantiene priceWithIvaVes consistente con priceVes + ivaVes', () => {
    const product = build(7.33, IvaType.REDUCIDO);
    applyVesPrices(product, 245.5);
    expect(product.priceWithIvaVes).toBe(
      Number((product.priceVes + product.ivaVes).toFixed(2)),
    );
  });

  it('deja el IVA en VES en cero para exentos', () => {
    const product = build(10, IvaType.EXENTO);
    applyVesPrices(product, 245.5);
    expect(product.ivaVes).toBe(0);
    expect(product.priceWithIvaVes).toBe(2455);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `yarn test -- --testPathPattern="product.entity|pricing.util"`
Expected: FAIL — `product.syncUsdIvaFields is not a function` en el primer archivo. El de `pricing.util` puede pasar ya (el comportamiento se preserva); si pasa, está bien: sirve de red de seguridad para el refactor del Step 3.

- [ ] **Step 3: Agregar el hook a la entidad**

En `src/products/product.entity.ts`, agregar `BeforeInsert` y `BeforeUpdate` al import de `typeorm` (la lista de imports empieza en la línea 1) y `fromBase` al final de los imports:

```ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Generated,
  OneToMany,
  ManyToMany,
  JoinTable,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
```

```ts
import { fromBase } from './iva.util';
```

Agregar este método al final de la clase `Product`, antes del cierre de la llave:

```ts
  /**
   * Deriva los campos de IVA en USD desde `price` y `ivaType`.
   *
   * Vive en la entidad, y no en un servicio, porque la operación es pura: no
   * necesita la tasa de cambio. Así ningún punto de escritura puede guardar un
   * producto con `iva` y `priceWithIva` desincronizados de `price`, que es
   * exactamente cómo esos campos quedaron congelados en la tasa de la
   * migración inicial.
   *
   * Los campos en VES no se pueden derivar acá porque sí necesitan la tasa;
   * quedan en `applyVesPrices()`, que se invoca donde la tasa está disponible.
   *
   * ATENCIÓN: `repository.update()` y los query builders NO disparan estos
   * hooks. Todo código que modifique `price` o `ivaType` debe usar `.save()`.
   */
  @BeforeInsert()
  @BeforeUpdate()
  syncUsdIvaFields(): void {
    const { iva, total } = fromBase(Number(this.price), this.ivaType);
    this.iva = iva;
    this.priceWithIva = total;
  }
```

- [ ] **Step 4: Refactorizar `applyVesPrices` para reusar el módulo**

Reemplazar el contenido completo de `src/products/pricing.util.ts`:

```ts
import { Product } from './product.entity';
import { fromBase, round2 } from './iva.util';

/**
 * Recalcula los tres campos en bolívares de un producto (base, IVA y total con
 * IVA) a partir de su precio en USD, su tipo de IVA y la tasa de cambio dada.
 *
 * El IVA en VES se calcula sobre la base ya convertida a VES, no convirtiendo
 * el IVA en USD, para que `priceWithIvaVes` quede siempre consistente con
 * `priceVes`. Es el mismo criterio de la migración AddIvaToProductsTable.
 *
 * Debe llamarse en todo punto que setee precios (creación, edición v1 y
 * sincronización diaria de tasa) para que los campos VES no queden congelados
 * en una tasa vieja. Los campos USD ya no dependen de esta función: los deriva
 * `Product.syncUsdIvaFields()` por hook de entidad.
 */
export function applyVesPrices(product: Product, rate: number): void {
  const priceVes = round2(Number(product.price) * rate);
  const { base, iva, total } = fromBase(priceVes, product.ivaType);

  product.priceVes = base;
  product.ivaVes = iva;
  product.priceWithIvaVes = total;
}
```

- [ ] **Step 5: Correr los tests para verificar que pasan**

Run: `yarn test -- --testPathPattern="product.entity|pricing.util"`
Expected: PASS

- [ ] **Step 6: Correr la suite completa para detectar regresiones**

Run: `yarn test`
Expected: PASS. Si `exchange-rate-tasks.service.spec.ts` falla, revisar si afirmaba los valores viejos de `iva`/`priceWithIva`; ese spec usa `.save()` así que el hook no corre en el mock — los asserts sobre campos VES deben seguir igual.

- [ ] **Step 7: Verificar que el hook dispara de verdad contra la base**

Los tests del Step 1 llaman a `syncUsdIvaFields()` directamente: prueban la aritmética, **no** que TypeORM invoque el hook. Los mocks de repositorio no ejecutan hooks, así que el cableado hay que verificarlo contra la base real.

```bash
yarn start:dev
```

Tomar el SKU de un producto existente y cambiarle el precio por la ruta v1, que es la única que puede editarlo:

```bash
curl -s -X PUT http://localhost:3000/api/v1/products/sku/<SKU_REAL> \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: <API_KEY_CON_PERMISO_WRITE>' \
  -d '{"price": 100}' | jq '{price, iva, priceWithIva, ivaType}'
```

Expected para un producto al 16% (`ivaType: 0`): `price: "100.00"`, `iva: "16.00"`, `priceWithIva: "116.00"`.

**Este es el chequeo que importa de toda la tarea.** Antes de este cambio `iva` y `priceWithIva` volvían con los valores viejos, congelados en el precio que el producto tenía al correr la migración inicial. Si siguen congelados, el hook no está disparando — revisar que el método tenga ambos decoradores y que la ruta use `.save()` y no `.update()`.

Dejar el precio como estaba al terminar.

- [ ] **Step 8: Lint y commit**

```bash
yarn lint
git add src/products/product.entity.ts src/products/product.entity.spec.ts \
        src/products/pricing.util.ts src/products/pricing.util.spec.ts
git commit -m "fix(products): derivar iva y price_with_iva por hook de entidad

Los campos USD de IVA se poblaron una vez en AddIvaToProductsTable y nunca
se recalculaban: applyVesPrices sólo tocaba los tres campos VES. Como las
órdenes facturan desde price_with_iva, un cambio de precio vía la API v1 no
llegaba a la factura.

La derivación pasa a @BeforeInsert/@BeforeUpdate porque es pura y no necesita
la tasa. Los campos VES se quedan en applyVesPrices, que ahora reusa el
módulo iva.util en vez de duplicar la aritmética."
```

---

### Task 3: Migración — backfill de derivados y columnas VES en órdenes

**Files:**
- Create: `src/database/migrations/<timestamp>-AddOrderVesTaxAndBackfillProductIva.ts`
- Modify: `src/orders/order.entity.ts` (agregar dos columnas después de `totalVes`, que termina en la línea ~157)

**Interfaces:**
- Produces: `Order.taxVes: number | null`, `Order.discountAmountVes: number | null`

- [ ] **Step 1: Generar el archivo de migración vacío**

```bash
yarn migration:create -- src/database/migrations/AddOrderVesTaxAndBackfillProductIva
```

Esto crea el archivo con el timestamp real. Anotá el nombre de clase que generó (incluye el timestamp) — hay que usarlo tal cual en el siguiente paso.

- [ ] **Step 2: Escribir la migración**

Reemplazar el cuerpo del archivo generado, **conservando el nombre de clase y el valor de `name` que generó el comando**:

```ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderVesTaxAndBackfillProductIva<TIMESTAMP>
  implements MigrationInterface
{
  name = 'AddOrderVesTaxAndBackfillProductIva<TIMESTAMP>';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Backfill de los derivados USD que quedaron congelados en la tasa de
    //    AddIvaToProductsTable. Las alícuotas van literales, no importadas de
    //    IVA_RATES: una migración es un registro histórico y debe producir el
    //    mismo resultado si mañana cambia el enum o la alícuota legal.
    await queryRunner.query(`UPDATE products SET iva = ROUND(price * CASE iva_type
    WHEN 0 THEN 0.16
    WHEN 1 THEN 0
    WHEN 2 THEN 0.08
    WHEN 3 THEN 0.24
    ELSE 0
END, 2)`);
    await queryRunner.query(
      `UPDATE products SET price_with_iva = price + iva`,
    );

    // 2. Idem VES. Es idempotente: applyVesPrices ya los mantiene, pero se
    //    normaliza por si alguna fila quedó fuera de sincronía.
    await queryRunner.query(`UPDATE products SET iva_ves = ROUND(price_ves * CASE iva_type
    WHEN 0 THEN 0.16
    WHEN 1 THEN 0
    WHEN 2 THEN 0.08
    WHEN 3 THEN 0.24
    ELSE 0
END, 2) WHERE price_ves IS NOT NULL`);
    await queryRunner.query(
      `UPDATE products SET price_with_iva_ves = price_ves + iva_ves WHERE price_ves IS NOT NULL`,
    );

    // 3. Columnas para el desglose en VES. El cliente paga en bolívares, así
    //    que el desglose que ve tiene que existir en esa moneda. Se usa
    //    numeric(10,2) por consistencia con subtotal_ves y total_ves; ambos
    //    montos nuevos son siempre menores que total_ves, así que alcanza.
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "tax_ves" numeric(10,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "discount_amount_ves" numeric(10,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "discount_amount_ves"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "tax_ves"`);
    // El backfill de precios no se revierte: recalcular valores correctos no
    // tiene inverso significativo.
  }
}
```

- [ ] **Step 3: Agregar las columnas a la entidad `Order`**

En `src/orders/order.entity.ts`, inmediatamente después del bloque de `totalVes` (que cierra alrededor de la línea 157):

```ts
  @Column({
    name: 'tax_ves',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  taxVes: number | null;

  @Column({
    name: 'discount_amount_ves',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  discountAmountVes: number | null;
```

- [ ] **Step 4: Correr la migración**

Run: `yarn migration:run`
Expected: se aplica sin error y aparece en `yarn migration:show` como ejecutada.

- [ ] **Step 5: Verificar el backfill contra la base**

```bash
psql "$DB_DATABASE" -c "SELECT COUNT(*) AS desincronizados FROM products WHERE price_with_iva IS DISTINCT FROM price + iva;"
```

Expected: `desincronizados = 0`

(Si `psql` no está disponible o las credenciales viven en `.env`, correr la misma consulta con el cliente que uses habitualmente.)

- [ ] **Step 6: Verificar que el down revierte**

```bash
yarn migration:revert
yarn migration:run
```

Expected: ambos comandos terminan sin error.

- [ ] **Step 7: Commit**

```bash
yarn lint
git add src/database/migrations src/orders/order.entity.ts
git commit -m "feat(orders): columnas de desglose en VES y backfill de IVA en productos

Backfill de iva y price_with_iva, que quedaron congelados en la tasa de
AddIvaToProductsTable, más los equivalentes en VES por consistencia.

Agrega orders.tax_ves y orders.discount_amount_ves: el cliente paga en
bolívares, así que el desglose que ve tiene que existir en esa moneda.
No se agrega marcador de versión de pricing porque todas las órdenes
actuales en producción son de prueba."
```

---

### Task 4: `OrderPricingService` — el calculador único

El componente central: cierra el defecto 1 (doble conteo del IVA) y es lo que hace imposible que el desglose mostrado difiera del facturado.

**Files:**
- Create: `src/orders/order-pricing.service.ts`
- Create: `src/orders/order-pricing.service.spec.ts`
- Modify: `src/orders/orders.module.ts` (agregar a `providers` y a `exports`)

**Interfaces:**
- Consumes: `fromTotal`, `round2` de `src/products/iva.util.ts` (Task 1); `DiscountsService.validateDiscount(code, orderTotal)` y `DiscountsService.findByCode(code)`; `ExchangeRatesService.findCurrent(): Promise<ExchangeRate>`
- Produces:
  - `interface PricingInput { items: Array<{ product: Product; quantity: number }>; discountCode?: string }`
  - `interface PricedLine { product: Product; quantity: number; unitPrice: number; lineTotal: number; discount: number; base: number; iva: number; total: number }`
  - `interface OrderPricing { lines: PricedLine[]; itemsTotal: number; discount: number; discountCode: string | null; discountId: number | null; subtotal: number; tax: number; shipping: number; total: number; exchangeRate: number | null; rateDate: string | null; subtotalVes: number | null; taxVes: number | null; discountVes: number | null; totalVes: number | null }`
  - `OrderPricingService.price(input: PricingInput): Promise<OrderPricing>`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/orders/order-pricing.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrderPricingService } from './order-pricing.service';
import { DiscountsService } from '../discounts/discounts.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { Product } from '../products/product.entity';
import { IvaType } from '../products/enums/iva-type.enum';

const producto = (priceWithIva: number, ivaType: IvaType): Product =>
  ({ priceWithIva, ivaType, id: 1 }) as unknown as Product;

describe('OrderPricingService', () => {
  let service: OrderPricingService;
  let discountsService: { validateDiscount: jest.Mock; findByCode: jest.Mock };
  let exchangeRatesService: { findCurrent: jest.Mock };

  beforeEach(async () => {
    discountsService = {
      validateDiscount: jest.fn(),
      findByCode: jest.fn(),
    };
    exchangeRatesService = {
      findCurrent: jest.fn().mockResolvedValue({
        rate: 245.5,
        date: '2026-07-29',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderPricingService,
        { provide: DiscountsService, useValue: discountsService },
        { provide: ExchangeRatesService, useValue: exchangeRatesService },
      ],
    }).compile();

    service = module.get<OrderPricingService>(OrderPricingService);
  });

  it('desglosa un ítem al 16% sin sumar el IVA dos veces', async () => {
    const result = await service.price({
      items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 2 }],
    });

    expect(result.itemsTotal).toBe(23.2);
    expect(result.subtotal).toBe(20);
    expect(result.tax).toBe(3.2);
    expect(result.total).toBe(23.2);
  });

  it('extrae el IVA por línea, sin inflar los productos exentos', async () => {
    const result = await service.price({
      items: [
        { product: producto(10, IvaType.EXENTO), quantity: 1 },
        { product: producto(11.6, IvaType.NORMAL), quantity: 1 },
      ],
    });

    expect(result.itemsTotal).toBe(21.6);
    expect(result.subtotal).toBe(20);
    expect(result.tax).toBe(1.6);
    expect(result.total).toBe(21.6);
  });

  it('prorratea el descuento por línea y recalcula el IVA sobre el neto', async () => {
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 2.32 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 7, code: 'PROMO10' });

    const result = await service.price({
      items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 2 }],
      discountCode: 'PROMO10',
    });

    expect(result.discount).toBe(2.32);
    expect(result.discountId).toBe(7);
    expect(result.discountCode).toBe('PROMO10');
    expect(result.subtotal).toBe(18);
    expect(result.tax).toBe(2.88);
    expect(result.total).toBe(20.88);
    expect(result.lines[0].discount).toBe(2.32);
  });

  it('asigna el céntimo residual del prorrateo a la línea de mayor monto', async () => {
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 0.01 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 1, code: 'X' });

    const result = await service.price({
      items: [
        { product: producto(30, IvaType.NORMAL), quantity: 1 },
        { product: producto(10, IvaType.NORMAL), quantity: 1 },
      ],
      discountCode: 'X',
    });

    const asignado = result.lines[0].discount + result.lines[1].discount;
    expect(asignado).toBe(0.01);
    expect(result.lines[0].discount).toBe(0.01);
    expect(result.lines[1].discount).toBe(0);
  });

  it('nunca deja el total por debajo de cero si el descuento excede el pedido', async () => {
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 500 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 1, code: 'X' });

    const result = await service.price({
      items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 1 }],
      discountCode: 'X',
    });

    expect(result.discount).toBe(11.6);
    expect(result.total).toBe(0);
    expect(result.subtotal).toBe(0);
    expect(result.tax).toBe(0);
  });

  it('rechaza un código de descuento inválido', async () => {
    discountsService.validateDiscount.mockResolvedValue({
      valid: false,
      error: 'Este cupón no está activo',
    });

    await expect(
      service.price({
        items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 1 }],
        discountCode: 'MALO',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('calcula el total en VES sumando sus partes, para que el desglose cuadre', async () => {
    const result = await service.price({
      items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 2 }],
    });

    expect(result.exchangeRate).toBe(245.5);
    expect(result.rateDate).toBe('2026-07-29');
    expect(result.subtotalVes).toBe(4910);
    expect(result.taxVes).toBe(785.6);
    expect(result.totalVes).toBe(5695.6);
    expect(result.totalVes).toBe(result.subtotalVes! + result.taxVes!);
  });

  it('sigue calculando en USD si no hay tasa de cambio disponible', async () => {
    exchangeRatesService.findCurrent.mockRejectedValue(
      new Error('No exchange rate found'),
    );

    const result = await service.price({
      items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 1 }],
    });

    expect(result.total).toBe(11.6);
    expect(result.exchangeRate).toBeNull();
    expect(result.totalVes).toBeNull();
    expect(result.taxVes).toBeNull();
  });

  it('normaliza rateDate cuando el driver devuelve un Date', async () => {
    exchangeRatesService.findCurrent.mockResolvedValue({
      rate: 245.5,
      date: new Date('2026-07-29T00:00:00.000Z'),
    });

    const result = await service.price({
      items: [{ product: producto(11.6, IvaType.NORMAL), quantity: 1 }],
    });

    expect(result.rateDate).toBe('2026-07-29');
  });

  it('mantiene la invariante subtotal + tax === itemsTotal - discount', async () => {
    discountsService.validateDiscount.mockResolvedValue({
      valid: true,
      discount: { discountAmount: 3.77 },
    });
    discountsService.findByCode.mockResolvedValue({ id: 1, code: 'X' });

    const result = await service.price({
      items: [
        { product: producto(11.6, IvaType.NORMAL), quantity: 3 },
        { product: producto(10.8, IvaType.REDUCIDO), quantity: 2 },
        { product: producto(7, IvaType.EXENTO), quantity: 1 },
        { product: producto(12.4, IvaType.LUJO), quantity: 1 },
      ],
      discountCode: 'X',
    });

    expect(result.subtotal + result.tax).toBeCloseTo(
      result.itemsTotal - result.discount,
      2,
    );
    expect(result.total).toBeCloseTo(result.itemsTotal - result.discount, 2);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `yarn test -- --testPathPattern=order-pricing`
Expected: FAIL — `Cannot find module './order-pricing.service'`

- [ ] **Step 3: Implementar el servicio**

Crear `src/orders/order-pricing.service.ts`:

```ts
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

    const lines: PricedLine[] = items.map((item, index) => {
      const lineTotal = lineTotals[index];
      const lineDiscount = perLine[index];
      const net = round2(lineTotal - lineDiscount);
      // La extracción es por línea, con la alícuota propia de cada producto.
      // Hacerla sobre el agregado con una tasa mezclada le cobraría IVA a los
      // productos exentos.
      const { base, iva } = fromTotal(net, item.product.ivaType);

      return {
        product: item.product,
        quantity: item.quantity,
        unitPrice: round2(Number(item.product.priceWithIva)),
        lineTotal,
        discount: lineDiscount,
        base,
        iva,
        total: net,
      };
    });

    const tax = round2(lines.reduce((sum, line) => sum + line.iva, 0));
    const subtotal = round2(lines.reduce((sum, line) => sum + line.base, 0));
    const shipping = OrderPricingService.SHIPPING;
    const total = round2(subtotal + tax + shipping);

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
      ...(await this.convertToVes({ subtotal, tax, discount })),
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
   * El residuo de redondeo se asigna a la línea de mayor monto para que la
   * suma de las partes sea exactamente el descuento otorgado. Sin eso el
   * desglose puede quedar descuadrado por un céntimo.
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
    const assigned = round2(shares.reduce((sum, v) => sum + v, 0));
    const residual = round2(discount - assigned);

    if (residual !== 0) {
      let largest = 0;
      for (let i = 1; i < lineTotals.length; i++) {
        if (lineTotals[i] > lineTotals[largest]) largest = i;
      }
      shares[largest] = round2(shares[largest] + residual);
    }

    return shares;
  }

  /**
   * Convierte el desglose a bolívares.
   *
   * `totalVes` sale de sumar sus partes y no de convertir el total por
   * separado: la diferencia es de un céntimo como máximo, pero garantiza que
   * los tres números que ve el cliente en pantalla sumen exacto.
   *
   * Si no hay tasa disponible se devuelven nulos y el pedido sigue en USD, que
   * es el comportamiento que ya tenía `createOrder`.
   */
  private async convertToVes({
    subtotal,
    tax,
    discount,
  }: {
    subtotal: number;
    tax: number;
    discount: number;
  }): Promise<
    Pick<
      OrderPricing,
      | 'exchangeRate'
      | 'rateDate'
      | 'subtotalVes'
      | 'taxVes'
      | 'discountVes'
      | 'totalVes'
    >
  > {
    try {
      const current = await this.exchangeRatesService.findCurrent();
      const rate = Number(current.rate);
      const subtotalVes = round2(subtotal * rate);
      const taxVes = round2(tax * rate);

      return {
        exchangeRate: rate,
        rateDate: this.formatRateDate(current.date),
        subtotalVes,
        taxVes,
        discountVes: round2(discount * rate),
        totalVes: round2(subtotalVes + taxVes),
      };
    } catch {
      console.warn(
        'Exchange rate not available, continuing without VES prices',
      );
      return {
        exchangeRate: null,
        rateDate: null,
        subtotalVes: null,
        taxVes: null,
        discountVes: null,
        totalVes: null,
      };
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
```

- [ ] **Step 4: Registrar el servicio en el módulo**

En `src/orders/orders.module.ts`, agregar el import:

```ts
import { OrderPricingService } from './order-pricing.service';
```

y agregarlo a `providers` y a `exports`:

```ts
  providers: [
    OrdersService,
    OrderPricingService,
    GuestCustomersService,
    S3Service,
    EmailService,
  ],
  exports: [OrdersService, OrderPricingService, GuestCustomersService],
```

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `yarn test -- --testPathPattern=order-pricing`
Expected: PASS — los 11 casos.

- [ ] **Step 6: Lint y commit**

```bash
yarn lint
git add src/orders/order-pricing.service.ts src/orders/order-pricing.service.spec.ts src/orders/orders.module.ts
git commit -m "feat(orders): calculador único de precios del pedido

Modelo de precios con IVA incluido: priceWithIva es lo que el cliente vio en
el catálogo y el desglose se extrae hacia atrás, por línea y con la alícuota
propia de cada producto. Extraer sobre el agregado con una tasa mezclada le
cobraría IVA a los exentos.

El descuento opera sobre el monto inclusivo y se prorratea por línea, con el
residuo de redondeo asignado a la línea mayor para que las partes sumen
exacto. totalVes sale de sumar sus partes, no de convertir el total, para que
el desglose cuadre en pantalla.

Todavía no tiene consumidores; los conecta el commit siguiente."
```

---

### Task 5: `POST /orders/quote` — previsualización del checkout

Cierra la causa raíz del síntoma reportado: hoy el frontend no tiene forma de pedir el desglose antes de crear la orden.

**Files:**
- Create: `src/orders/dto/quote-order.dto.ts`
- Modify: `src/orders/orders.service.ts` (nuevo método `quoteOrder`; inyectar `OrderPricingService` en el constructor, que empieza en la línea ~30)
- Modify: `src/orders/orders.controller.ts` (nuevo endpoint)
- Test: `src/orders/orders.service.quoteOrder.spec.ts`

**Interfaces:**
- Consumes: `OrderPricingService.price()` (Task 4)
- Produces:
  - `QuoteOrderDto { items: QuoteOrderItemDto[]; discountCode?: string }`
  - `OrdersService.quoteOrder(dto: QuoteOrderDto): Promise<OrderQuote>`
  - `interface OrderQuote` — la forma exacta del contrato para el frontend

- [ ] **Step 1: Crear el DTO**

Crear `src/orders/dto/quote-order.dto.ts`:

```ts
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuoteOrderItemDto {
  @ApiProperty({ description: 'UUID del producto' })
  @IsNotEmpty()
  @IsString()
  productUuid: string;

  @ApiProperty({ description: 'Cantidad', minimum: 1, example: 2 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class QuoteOrderDto {
  @ApiProperty({ type: [QuoteOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteOrderItemDto)
  items: QuoteOrderItemDto[];

  @ApiPropertyOptional({ description: 'Código de descuento a aplicar' })
  @IsOptional()
  @IsString()
  discountCode?: string;
}
```

- [ ] **Step 2: Escribir el test que falla**

Crear `src/orders/orders.service.quoteOrder.spec.ts`. Reusa la forma de providers de `orders.service.getPendingOrders.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrderPricingService } from './order-pricing.service';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import { PaymentInfo } from './payment-info.entity';
import { Cart } from '../cart/cart.entity';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { GuestCustomersService } from './guest-customers.service';
import { EmailService } from '../email/email.service';
import { DiscountsService } from '../discounts/discounts.service';
import { BanksService } from '../banks/banks.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { IvaType } from '../products/enums/iva-type.enum';

describe('OrdersService.quoteOrder', () => {
  let service: OrdersService;
  let productRepository: { findOne: jest.Mock };
  let pricingService: { price: jest.Mock };

  const producto = (over: Partial<Product> = {}): Product =>
    ({
      id: 1,
      uuid: 'uuid-1',
      name: 'Martillo 16oz',
      sku: 'MART-001',
      priceWithIva: 11.6,
      priceWithIvaVes: 2847.8,
      ivaType: IvaType.NORMAL,
      inventory: 10,
      published: true,
      ...over,
    }) as unknown as Product;

  beforeEach(async () => {
    productRepository = { findOne: jest.fn() };
    pricingService = { price: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrderPricingService, useValue: pricingService },
        { provide: getRepositoryToken(Order), useValue: {} },
        { provide: getRepositoryToken(OrderItem), useValue: {} },
        { provide: getRepositoryToken(ShippingAddress), useValue: {} },
        { provide: getRepositoryToken(PaymentInfo), useValue: {} },
        { provide: getRepositoryToken(Cart), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: productRepository },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: GuestCustomersService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: DiscountsService, useValue: {} },
        { provide: BanksService, useValue: {} },
        { provide: ExchangeRatesService, useValue: {} },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  const pricingDe = (p: Product) => ({
    lines: [
      {
        product: p,
        quantity: 2,
        unitPrice: 11.6,
        lineTotal: 23.2,
        discount: 0,
        base: 20,
        iva: 3.2,
        total: 23.2,
      },
    ],
    itemsTotal: 23.2,
    discount: 0,
    discountCode: null,
    discountId: null,
    subtotal: 20,
    tax: 3.2,
    shipping: 0,
    total: 23.2,
    exchangeRate: 245.5,
    rateDate: '2026-07-29',
    subtotalVes: 4910,
    taxVes: 785.6,
    discountVes: 0,
    totalVes: 5695.6,
  });

  it('devuelve el desglose completo sin persistir nada', async () => {
    const p = producto();
    productRepository.findOne.mockResolvedValue(p);
    pricingService.price.mockResolvedValue(pricingDe(p));

    const quote = await service.quoteOrder({
      items: [{ productUuid: 'uuid-1', quantity: 2 }],
    });

    expect(quote.canCheckout).toBe(true);
    expect(quote.exchangeRate).toBe(245.5);
    expect(quote.rateDate).toBe('2026-07-29');
    expect(quote.totals.subtotal).toBe(20);
    expect(quote.totals.tax).toBe(3.2);
    expect(quote.totals.total).toBe(23.2);
    expect(quote.totals.totalVes).toBe(5695.6);
    expect(quote.items).toHaveLength(1);
    expect(quote.items[0]).toMatchObject({
      productUuid: 'uuid-1',
      name: 'Martillo 16oz',
      sku: 'MART-001',
      quantity: 2,
      ivaRate: 16,
      unitPrice: 11.6,
      base: 20,
      iva: 3.2,
      total: 23.2,
      issue: null,
    });
  });

  it('marca el producto inexistente sin tumbar el resto del quote', async () => {
    productRepository.findOne.mockResolvedValue(null);
    pricingService.price.mockResolvedValue({
      ...pricingDe(producto()),
      lines: [],
      itemsTotal: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
    });

    const quote = await service.quoteOrder({
      items: [{ productUuid: 'no-existe', quantity: 1 }],
    });

    expect(quote.canCheckout).toBe(false);
    expect(quote.items[0].issue).toEqual({ code: 'NOT_FOUND' });
    expect(quote.items[0].unitPrice).toBeNull();
  });

  it('marca el producto despublicado y no lo cotiza', async () => {
    productRepository.findOne.mockResolvedValue(
      producto({ published: false }),
    );
    pricingService.price.mockResolvedValue({
      ...pricingDe(producto()),
      lines: [],
      itemsTotal: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
    });

    const quote = await service.quoteOrder({
      items: [{ productUuid: 'uuid-1', quantity: 1 }],
    });

    expect(quote.canCheckout).toBe(false);
    expect(quote.items[0].issue).toEqual({ code: 'NOT_PUBLISHED' });
  });

  it('cotiza el ítem sin stock suficiente pero informa lo disponible', async () => {
    const p = producto({ inventory: 1 });
    productRepository.findOne.mockResolvedValue(p);
    pricingService.price.mockResolvedValue(pricingDe(p));

    const quote = await service.quoteOrder({
      items: [{ productUuid: 'uuid-1', quantity: 2 }],
    });

    expect(quote.canCheckout).toBe(false);
    expect(quote.items[0].issue).toEqual({
      code: 'INSUFFICIENT_INVENTORY',
      available: 1,
    });
    // Se cotiza igual: el cliente necesita ver el monto del resto del pedido.
    expect(quote.items[0].total).toBe(23.2);
  });
});
```

- [ ] **Step 3: Correr el test para verificar que falla**

Run: `yarn test -- --testPathPattern=quoteOrder`
Expected: FAIL — `service.quoteOrder is not a function`

- [ ] **Step 4: Inyectar `OrderPricingService` en `OrdersService`**

En `src/orders/orders.service.ts`, agregar el import:

```ts
import { OrderPricingService } from './order-pricing.service';
import { QuoteOrderDto } from './dto/quote-order.dto';
```

y extender el import existente de la línea 21, que hoy trae sólo `IVA_RATES`:

```ts
import { IVA_RATES, IvaType } from '../products/enums/iva-type.enum';
```

y agregar el parámetro al final del constructor (después de `exchangeRatesService`, línea ~48):

```ts
    private readonly orderPricingService: OrderPricingService,
```

- [ ] **Step 5: Declarar los tipos del contrato**

Estos van a **nivel de módulo**, no dentro de la clase: después de los imports y antes del decorador `@Injectable()` de `OrdersService`.

```ts
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
```

- [ ] **Step 6: Implementar `quoteOrder`**

Este método sí va **dentro de la clase** `OrdersService`, inmediatamente antes de `createOrder`:

```ts
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
    const resolved = await Promise.all(
      quoteOrderDto.items.map(async (item) => {
        const product = await this.productRepository.findOne({
          where: { uuid: item.productUuid },
        });

        if (!product) {
          return { item, product: null, issue: { code: 'NOT_FOUND' } as const };
        }

        if (!product.published) {
          return {
            item,
            product,
            issue: { code: 'NOT_PUBLISHED' } as const,
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
      }),
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

    const lineByUuid = new Map(
      pricing.lines.map((line) => [line.product.uuid, line]),
    );

    const items: QuoteItem[] = resolved.map((entry) => {
      const { item, product, issue } = entry;
      const line = product ? lineByUuid.get(product.uuid) : undefined;
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
        totalVes:
          line && pricing.exchangeRate !== null
            ? Number((line.total * pricing.exchangeRate).toFixed(2))
            : null,
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
```

- [ ] **Step 7: Correr el test para verificar que pasa**

Run: `yarn test -- --testPathPattern=quoteOrder`
Expected: PASS — los 4 casos.

- [ ] **Step 8: Exponer el endpoint**

En `src/orders/orders.controller.ts`, agregar el import:

```ts
import { QuoteOrderDto } from './dto/quote-order.dto';
```

y el endpoint inmediatamente después de `createOrder` (que termina alrededor de la línea 49):

```ts
  /**
   * Previsualizar el desglose de un pedido sin crearlo.
   *
   * El checkout lo usa para mostrar base + IVA = total. No requiere
   * autenticación, igual que la creación de órdenes, porque el checkout
   * funciona para invitados.
   */
  @Post('quote')
  @UseGuards(OptionalJwtAuthGuard)
  async quoteOrder(@Body() quoteOrderDto: QuoteOrderDto) {
    return this.ordersService.quoteOrder(quoteOrderDto);
  }
```

- [ ] **Step 9: Verificar el orden de las rutas**

`@Post('quote')` no colisiona con `@Post()` ni con `@Post(':uuid/receipt')`, pero conviene confirmar que Nest la resuelve. Levantar el servidor y probar:

```bash
yarn start:dev
```

En otra terminal:

```bash
curl -s -X POST http://localhost:3000/orders/quote \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"productUuid":"<UUID_REAL_DE_UN_PRODUCTO>","quantity":2}]}' | jq
```

Expected: JSON con `totals.subtotal`, `totals.tax`, `totals.total` donde `subtotal + tax === total`, y `canCheckout: true`. Tomar un UUID real con `curl -s http://localhost:3000/products | jq -r '.[0].uuid'` (ajustar según la forma de la respuesta paginada).

- [ ] **Step 10: Lint y commit**

```bash
yarn lint
git add src/orders/dto/quote-order.dto.ts src/orders/orders.service.ts \
        src/orders/orders.controller.ts src/orders/orders.service.quoteOrder.spec.ts
git commit -m "feat(orders): endpoint de previsualización del desglose del pedido

El checkout no tenía forma de pedirle el desglose al backend: los totales
sólo existían después del POST /orders, así que el frontend calculaba su
propio IVA y mostraba un número que el backend nunca validó.

POST /orders/quote devuelve base + IVA = total, por línea y agregado, en USD
y VES, sin persistir nada. Los problemas por ítem (inexistente, despublicado,
sin stock) se reportan como issue y bajan canCheckout, en vez de responder
400: un error global dejaría la página en blanco sin decir qué producto falló."
```

---

### Task 6: `createOrder` factura con el calculador único

**Files:**
- Modify: `src/orders/orders.service.ts` (reemplazar el bloque de cálculo de `createOrder`: el loop de validación en las líneas ~103-138, el cálculo de `tax`/descuento/`total` en las ~189-234, la asignación de campos en las ~292-301, y la creación de items en las ~306-333)
- Modify: `src/orders/dto/create-order.dto.ts` (nuevo campo opcional `expectedExchangeRate`)
- Test: `src/orders/orders.service.createOrder.exchangeRate.spec.ts` (actualizar)

**Interfaces:**
- Consumes: `OrderPricingService.price()` (Task 4), `Order.taxVes` y `Order.discountAmountVes` (Task 3)
- Produces: `createOrder` lanza `ConflictException` (409) si `expectedExchangeRate` no coincide con la tasa de facturación

- [ ] **Step 1: Agregar `expectedExchangeRate` al DTO**

En `src/orders/dto/create-order.dto.ts`, dentro de `CreateOrderDto` (que empieza en la línea 136), después de `discountCode`:

```ts
  @ApiPropertyOptional({
    description:
      'Tasa de cambio que el cliente vio en el quote. Si no coincide con la tasa de facturación, la orden se rechaza con 409 para que la UI pida reconfirmación.',
    example: 245.5,
  })
  @IsOptional()
  @IsNumber()
  expectedExchangeRate?: number;
```

Verificar que `IsNumber` y `ApiPropertyOptional` estén importados en ese archivo; si no, agregarlos a los imports existentes de `class-validator` y `@nestjs/swagger`.

- [ ] **Step 2: Adaptar el spec existente**

`src/orders/orders.service.createOrder.exchangeRate.spec.ts` ya tiene el armado que hace falta: un helper `build(rows)` que compila el módulo, un `dto` de pedido (2 unidades de un producto con `priceWithIva: 11.6` al 16%) y un `rateRow(date, rate)`. Se reusa tal cual, con tres cambios.

**2a.** Agregar `ConflictException` a los imports de `@nestjs/common` (el archivo todavía no importa de ahí, así que agregar la línea):

```ts
import { ConflictException } from '@nestjs/common';
```

y el servicio nuevo:

```ts
import { OrderPricingService } from './order-pricing.service';
```

**2b.** Registrar `OrderPricingService` **real** (no mockeado) en el `providers` de `build()`, justo después de `ExchangeRatesService` (línea ~109), para que el test recorra la aritmética de punta a punta:

```ts
        OrderPricingService, // servicio real: el test recorre el cálculo entero
```

**2c.** Corregir la aserción de la línea ~171 del primer test, que afirma el valor viejo. `subtotal` deja de ser inclusivo (23.2) y pasa a ser la base (20):

```ts
    // subtotal = base sin IVA = 20 USD => 20 * 750 = 15000 Bs
    expect(savedOrder.subtotalVes).toBe(15000);
```

Las otras aserciones de ese test siguen válidas: `priceVes` es 8700 (`11.6 × 750`, el precio inclusivo unitario) y `subtotalVes` del item es 17400 (`23.2 × 750`, el monto de línea inclusivo).

**2d.** Agregar los cuatro tests nuevos al final del `describe`:

```ts
  it('no suma el IVA dos veces en el total', async () => {
    await build([rateRow(TODAY, TASA_VIGENTE)]);

    await service.createOrder(dto, null);

    const savedOrder = (orderRepo.save.mock.calls as Array<[Order]>)[0][0];

    // Producto de base 10.00 al 16% => priceWithIva 11.60, cantidad 2.
    // El total debe ser 23.20; el doble conteo daba 26.40
    // (subtotal inclusivo 23.20 + IVA extraído 3.20).
    expect(Number(savedOrder.subtotal)).toBe(20);
    expect(Number(savedOrder.tax)).toBe(3.2);
    expect(Number(savedOrder.total)).toBe(23.2);
    expect(Number(savedOrder.subtotal) + Number(savedOrder.tax)).toBe(
      Number(savedOrder.total),
    );
  });

  it('persiste el desglose en VES y hace que sus partes sumen', async () => {
    await build([rateRow(TODAY, TASA_VIGENTE)]);

    await service.createOrder(dto, null);

    const savedOrder = (orderRepo.save.mock.calls as Array<[Order]>)[0][0];

    // 20 × 744.22 = 14884.40 ; 3.2 × 744.22 = 2381.50 ; suma = 17265.90
    expect(Number(savedOrder.subtotalVes)).toBe(14884.4);
    expect(Number(savedOrder.taxVes)).toBe(2381.5);
    expect(Number(savedOrder.totalVes)).toBe(17265.9);
    expect(Number(savedOrder.totalVes)).toBe(
      Number(savedOrder.subtotalVes) + Number(savedOrder.taxVes),
    );
  });

  it('rechaza con 409 si la tasa cambió desde el quote', async () => {
    await build([rateRow(TODAY, TASA_VIGENTE)]);

    await expect(
      service.createOrder(
        { ...dto, expectedExchangeRate: 700 } as CreateOrderDto,
        null,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('acepta la orden si expectedExchangeRate coincide con la tasa de facturación', async () => {
    await build([rateRow(TODAY, TASA_VIGENTE)]);

    await service.createOrder(
      { ...dto, expectedExchangeRate: TASA_VIGENTE } as CreateOrderDto,
      null,
    );

    const savedOrder = (orderRepo.save.mock.calls as Array<[Order]>)[0][0];
    expect(Number(savedOrder.total)).toBe(23.2);
  });
```

El `DiscountsService` mockeado como `{}` alcanza: el `dto` no lleva `discountCode`, así que `OrderPricingService` nunca lo invoca.

- [ ] **Step 3: Correr el test para verificar que falla**

Run: `yarn test -- --testPathPattern=createOrder.exchangeRate`
Expected: FAIL — el total da 26.40 en vez de 23.20 (el doble conteo), y `ConflictException` no se lanza.

- [ ] **Step 4: Reemplazar el cálculo en `createOrder`**

En `src/orders/orders.service.ts`:

**4a.** Agregar `ConflictException` al import de `@nestjs/common`.

**4b.** Reemplazar el loop de validación (líneas ~103-138) por esto, que conserva las validaciones duras — acá sí se rechaza, a diferencia del quote — pero deja de acumular el subtotal a mano:

```ts
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
```

**4c.** Reemplazar el bloque de `tax`, descuento, `total` y conversión a VES (líneas ~189-234, desde `const tax = validatedItems.reduce(` hasta el cierre del `catch` de la tasa) por:

```ts
    // 3.5 Calcular el desglose con el calculador único, el mismo que usa
    //     POST /orders/quote. Nunca se aceptan montos del cliente.
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
```

`OrderPricingService` ya resolvió el descuento y devuelve `discountId` y `discountCode`, así que no hace falta volver a consultarlo acá.

**4d.** Reemplazar la asignación de totales en el objeto `order` (líneas ~292-301) por:

```ts
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
```

**4e.** Reemplazar la creación de items (líneas ~306-333) por esto, que toma los montos ya calculados en vez de recalcularlos:

```ts
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
            ? Number((line.unitPrice * pricing.exchangeRate).toFixed(2))
            : null,
        subtotalVes:
          pricing.exchangeRate !== null
            ? Number((line.total * pricing.exchangeRate).toFixed(2))
            : null,
      });

      createdOrderItems.push(orderItem);
    }
```

**4f.** Eliminar del archivo las variables que quedaron sin uso (`subtotal`, `tax`, `discountAmount`, `orderTotalBeforeDiscount`, `total`, `exchangeRate`, `subtotalVes`, `totalVes` locales de `createOrder`) y cualquier import que ya no se use. `IVA_RATES` **sigue en uso** en `getPendingOrders` (línea ~1049) y en `quoteOrder`: no lo borres.

Revisar el resto de `createOrder` por referencias a `validatedItems[].productUuid`, que ya no existe en la nueva forma; usar `line.product.uuid` donde haga falta.

- [ ] **Step 5: Correr el test para verificar que pasa**

Run: `yarn test -- --testPathPattern=createOrder.exchangeRate`
Expected: PASS

- [ ] **Step 6: Correr la suite completa**

Run: `yarn test`
Expected: PASS. `orders.service.getPendingOrders.spec.ts` puede fallar si afirma montos: ahora `item.subtotal` viene neto de descuento, no bruto. El contrato v1 no cambia de forma — corregir los montos esperados del spec, no la implementación de `getPendingOrders`.

Si algún spec falla por falta del provider `OrderPricingService` en su `TestingModule`, agregarlo como `{ provide: OrderPricingService, useValue: { price: jest.fn() } }`.

- [ ] **Step 7: Verificar contra el servidor real**

```bash
yarn start:dev
```

Crear una orden con `curl` (reusar el cuerpo de un pedido de prueba existente) y confirmar en la respuesta que `subtotal + tax === total` y que `subtotalVes + taxVes === totalVes`.

- [ ] **Step 8: Lint y commit**

```bash
yarn lint
git add src/orders/orders.service.ts src/orders/dto/create-order.dto.ts \
        src/orders/orders.service.createOrder.exchangeRate.spec.ts \
        src/orders/orders.service.getPendingOrders.spec.ts
git commit -m "fix(orders): dejar de contar el IVA dos veces en el total

subtotal se acumulaba desde priceWithIva (inclusivo) y después se le sumaba
el tax extraído de ese mismo monto, así que el total quedaba ~13.8% por
encima del correcto en productos al 16%.

createOrder pasa a facturar con OrderPricingService, el mismo calculador que
alimenta POST /orders/quote, de modo que el monto mostrado y el facturado no
puedan divergir. subtotal ahora es la base sin IVA y total = subtotal + tax,
que es lo que el cliente sumó en el catálogo menos su descuento.

Agrega el guard de deriva de tasa: si expectedExchangeRate no coincide con la
tasa de facturación se responde 409 con el desglose nuevo, en vez de cobrar
un monto que el cliente no aceptó."
```

---

### Task 7: Carrito a precio inclusivo

Cierra el defecto 3: el carrito mostraba base sin IVA y el checkout cobraba inclusivo, así que el monto saltaba entre pantallas.

**Files:**
- Modify: `src/cart/cart.service.ts` (líneas 79, 86, 127, 171-172)
- Modify: `src/cart/cart-item.entity.ts` (líneas 50 y 54-57)
- Test: `src/cart/cart-item.entity.spec.ts` (crear)

**Interfaces:**
- Consumes: `Product.priceWithIva` y `Product.priceWithIvaVes`, ya siempre frescos por el hook de la Task 2 y el backfill de la Task 3

- [ ] **Step 1: Leer los puntos a cambiar**

```bash
grep -n "price" src/cart/cart.service.ts src/cart/cart-item.entity.ts
```

Confirmar que las cinco referencias a `product.price` / `product.priceVes` son las de las líneas 79, 86, 127, 171-172 (servicio) y 54-57 (entidad).

- [ ] **Step 2: Escribir el test que falla**

Crear `src/cart/cart-item.entity.spec.ts`:

```ts
import { CartItem } from './cart-item.entity';
import { Product } from '../products/product.entity';

describe('CartItem', () => {
  const item = (price: number, quantity: number, product: Partial<Product>) => {
    const cartItem = new CartItem();
    cartItem.price = price;
    cartItem.quantity = quantity;
    cartItem.product = product as Product;
    return cartItem;
  };

  it('calcula el subtotal con el precio inclusivo de IVA', () => {
    const cartItem = item(11.6, 2, { priceWithIvaVes: 2847.8 });
    expect(cartItem.subtotal).toBe(23.2);
  });

  it('calcula el subtotal en VES desde el precio inclusivo, no desde la base', () => {
    const cartItem = item(11.6, 2, { priceWithIvaVes: 2847.8 });
    expect(cartItem.subtotalVes).toBe(5695.6);
  });

  it('devuelve 0 en VES si el producto no tiene precio inclusivo en VES', () => {
    const cartItem = item(11.6, 2, { priceWithIvaVes: null as never });
    expect(cartItem.subtotalVes).toBe(0);
  });
});
```

- [ ] **Step 3: Correr el test para verificar que falla**

Run: `yarn test -- --testPathPattern=cart-item`
Expected: FAIL en el caso de VES — el getter usa `product.priceVes`, que no está seteado en el mock, así que devuelve 0 en vez de 5695.6.

- [ ] **Step 4: Cambiar el getter de la entidad**

En `src/cart/cart-item.entity.ts`, reemplazar el getter de VES (líneas ~53-58):

```ts
  get subtotalVes(): number {
    // El precio inclusivo de IVA, para que el monto del carrito sea el mismo
    // que el cliente vio en el catálogo y el que se le facturará.
    if (!this.product || !this.product.priceWithIvaVes) {
      return 0;
    }
    return Number(this.product.priceWithIvaVes) * this.quantity;
  }
```

- [ ] **Step 5: Cambiar el servicio a precio inclusivo**

En `src/cart/cart.service.ts`, cambiar las cuatro asignaciones de `product.price` a `product.priceWithIva`:

- Línea ~79: `existingItem.price = product.priceWithIva;`
- Línea ~86: `price: product.priceWithIva,`
- Línea ~127: `cartItem.price = product.priceWithIva; // Actualizar precio por si cambió`
- Líneas ~171-172:

```ts
        if (product && item.price !== product.priceWithIva) {
          item.price = product.priceWithIva;
```

Agregar un comentario sobre la asignación de la línea 86:

```ts
        // El carrito guarda el precio con IVA incluido: es el que el cliente
        // vio en el catálogo y el que se le facturará. Guardar la base acá
        // hacía que el monto saltara entre carrito y checkout.
```

- [ ] **Step 6: Correr el test para verificar que pasa**

Run: `yarn test -- --testPathPattern=cart`
Expected: PASS

- [ ] **Step 7: Correr la suite completa**

Run: `yarn test`
Expected: PASS

- [ ] **Step 8: Lint y commit**

```bash
yarn lint
git add src/cart/cart.service.ts src/cart/cart-item.entity.ts src/cart/cart-item.entity.spec.ts
git commit -m "fix(cart): guardar el precio con IVA incluido

El carrito trabajaba en base sin IVA (product.price / product.priceVes)
mientras las órdenes facturaban desde priceWithIva, así que el monto saltaba
entre el carrito y el checkout.

Ahora el carrito guarda el mismo precio inclusivo que muestra el catálogo y
que se factura."
```

---

### Task 8: Documentar el contrato y el riesgo de despliegue

**Files:**
- Create: `docs/pricing-iva.md`
- Modify: `CLAUDE.md` (sección "Exchange Rate System", alrededor de la línea que la describe)

- [ ] **Step 1: Escribir la nota de contrato**

Crear `docs/pricing-iva.md`:

```markdown
# Precios e IVA

## Modelo

`products.price` (USD) es la **base sin IVA** y la única fuente de verdad. Es
lo que envía el sistema externo por `PUT /api/v1/products/sku/:sku`. El panel
admin no puede editar precios.

Todo lo demás se deriva:

| Campo | Derivado de | Dónde |
|---|---|---|
| `iva`, `price_with_iva` | `price` + `iva_type` | `Product.syncUsdIvaFields()` (hook de entidad) |
| `price_ves`, `iva_ves`, `price_with_iva_ves` | `price` + `iva_type` + tasa | `applyVesPrices()` (servicio) |

La matemática vive en `src/products/iva.util.ts` y en ningún otro lugar.

**El catálogo muestra `price_with_iva` / `price_with_iva_ves`** — el precio
completo que paga el cliente. El checkout desglosa ese mismo número hacia
atrás: `base = total / (1 + r)`, `iva = total − base`. El total no cambia
entre catálogo y checkout; sólo se explica.

## Reglas

- **Redondeo:** nunca se redondean los tres miembros de un desglose por
  separado. Se redondean dos y el tercero sale por resta, para que
  `base + iva === total` sea exacto.
- **La extracción del IVA es por línea**, con la alícuota propia de cada
  producto. Hacerla sobre el agregado con una tasa mezclada le cobra IVA a los
  productos exentos.
- **`totalVes` sale de sumar `subtotalVes + taxVes`**, no de convertir el total
  por separado, para que el desglose cuadre en pantalla.
- **`IvaType.NORMAL === 0`**, así que `IVA_RATES[undefined] ?? 0` trataría un
  producto sin `ivaType` como exento. Usar siempre `ivaType ?? IvaType.NORMAL`.
- **Los hooks `@BeforeUpdate` no disparan con `repository.update()` ni con
  query builders.** Todo código que modifique `price` o `ivaType` debe usar
  `.save()`.
- **El descuento opera sobre el monto inclusivo** y se prorratea por línea; el
  residuo de redondeo va a la línea de mayor monto.

## Contrato del checkout

`POST /orders/quote` devuelve el desglose sin persistir nada. Es lo que el
frontend debe consumir para mostrar base + IVA = total; **no debe calcular el
IVA por su cuenta**.

`POST /orders` recalcula todo desde cero con el mismo `OrderPricingService` y
nunca acepta montos del cliente. Si se envía `expectedExchangeRate` y la tasa
de facturación cambió, responde **409** con el desglose nuevo.

## Pendientes

- **IVA sobre el envío:** `shipping` está en 0 (TODO en
  `OrdersService.createOrder`). Cuando se implemente hay que decidir si el
  envío entra a la base gravable.
- **Contrato v1 del ERP:** `GET /api/v1/orders` emite `line_items[].total` con
  IVA incluido. La convención WooCommerce, sobre la que está modelada esa
  respuesta, define ese campo **sin** impuesto y `total_tax` aparte. Está
  pendiente de confirmar con el equipo del ERP cuál interpretan; si esperan la
  convención WooCommerce, hoy les llega inflado y hay que corregirlo.

## Órdenes históricas

Las órdenes creadas antes de este cambio tienen `subtotal` **inclusivo de
IVA** y `total` con el IVA contado dos veces. Se dejaron intactas porque todas
las órdenes en producción a esa fecha eran de prueba. No se agregó marcador de
versión.
```

- [ ] **Step 2: Apuntar desde `CLAUDE.md`**

En `CLAUDE.md`, en la sección `### Exchange Rate System`, agregar al final del párrafo existente:

```markdown
Los productos guardan la base sin IVA en USD; el IVA y los precios en VES se derivan. Ver `docs/pricing-iva.md` para el modelo completo, las reglas de redondeo y el contrato del checkout.
```

- [ ] **Step 3: Commit**

```bash
git add docs/pricing-iva.md CLAUDE.md
git commit -m "docs(pricing): documentar el modelo de IVA y el contrato del checkout"
```

- [ ] **Step 4: Avisar el riesgo de despliegue**

**Este paso no es código.** Antes de desplegar, avisar al equipo del ERP:

> `order.total` se corrige y **baja ~12%** en órdenes con productos gravados
> (un pedido al 16% que facturaba 26.40 pasa a facturar 23.20),
> porque el IVA se estaba contando dos veces. El contrato de
> `GET /api/v1/orders` no cambia de forma, pero los montos sí. Además está
> pendiente confirmar si interpretan `line_items[].total` con o sin IVA.

---

## Verificación final

- [ ] `yarn test` — toda la suite en verde
- [ ] `yarn lint` — sin errores
- [ ] `yarn build` — compila
- [ ] `yarn migration:show` — la migración nueva aparece como ejecutada
- [ ] Consulta de coherencia contra la base:

```sql
SELECT COUNT(*) AS desincronizados
FROM products
WHERE price_with_iva IS DISTINCT FROM price + iva;
```

Expected: 0

- [ ] Prueba de punta a punta: cotizar un pedido con `POST /orders/quote`,
      crearlo con `POST /orders` usando el `expectedExchangeRate` del quote, y
      confirmar que `subtotal + tax === total` en ambas respuestas y que el
      total coincide entre el quote y la orden creada.

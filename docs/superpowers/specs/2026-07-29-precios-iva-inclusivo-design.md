# Precios con IVA incluido en catálogo y desglose en checkout

**Fecha:** 2026-07-29
**Rama:** `feat/tasa-publicada-servicio-central`

## Problema

En https://www.constru-ir.com/checkout el IVA se muestra pero no se suma al total. La causa no es un error de presentación: son tres defectos de backend que comparten una misma raíz — **no existe una definición única de "precio de venta" en el código**, y cada capa eligió la suya.

### Defecto 1 — El total de la orden cuenta el IVA dos veces

En `src/orders/orders.service.ts`:

- Línea 132: `subtotal += Number(product.priceWithIva) * item.quantity` — el subtotal **ya incluye** IVA.
- Líneas 189-193: `tax` se **extrae** de ese mismo subtotal inclusivo (`subtotal * r / (1 + r)`).
- Línea 198: `total = subtotal + tax + shippingCost` — **el IVA se suma otra vez**.

En un producto al 16% el total queda ~13.8% por encima del correcto. Esto explica el síntoma: si el frontend sumara el `total` del backend cobraría de más, así que alguien lo compensó del lado del cliente mostrando el IVA sin sumarlo.

### Defecto 2 — Los derivados de IVA en USD quedan congelados

`applyVesPrices()` (`src/products/pricing.util.ts:16`) sólo recalcula los tres campos VES. Las columnas USD `iva` y `price_with_iva` se poblaron una única vez en la migración `AddIvaToProductsTable1776875135007` y **nunca se recalculan**.

Como las órdenes facturan desde `price_with_iva`, cuando el sistema externo actualiza `price` vía `PUT /api/v1/products/sku/:sku` el precio nuevo **no llega a la factura**.

### Defecto 3 — El carrito y las órdenes usan semánticas opuestas

El carrito trabaja en base sin IVA (`cart.service.ts:79,86,127,172` usan `product.price`; `cart-item.entity.ts:50,57` usan `price` y `product.priceVes`), mientras las órdenes facturan desde `priceWithIva`. El monto salta entre carrito y checkout.

### Causa raíz del síntoma reportado

**No existe endpoint de previsualización.** El frontend no tiene forma de pedir el desglose antes de crear la orden; los totales sólo existen después del `POST /orders`. Por eso el checkout calcula el IVA por su cuenta y muestra un número que el backend nunca validó.

## Estado actual del modelo de datos

`price` (USD) es la fuente de verdad y contiene la **base sin IVA** — confirmado: es lo que envía el sistema externo. Ningún endpoint acepta `iva` ni `price_with_iva`; son columnas derivadas.

### Puntos de escritura de precio

| Endpoint | DTO | Campos de precio que acepta |
|---|---|---|
| `POST /products` (admin) | `CreateProductDto` | `price`, `ivaType` |
| `PATCH /products/:uuid` (admin) | `Partial(Omit(Create, ['price','inventory']))` | **sólo `ivaType`** |
| `POST /api/v1/products` | `CreateProductForV1Dto` | `price`, `inventory`, `ivaType` |
| `PUT /api/v1/products/sku/:sku` | `Partial(CreateProductForV1Dto)` | `price`, `inventory`, `ivaType` |

El panel admin **no puede editar el precio**. Los precios entran por integración externa.

## Modelo objetivo

**Precio de catálogo = `price` + IVA.** En el checkout ese mismo número se desglosa hacia atrás:

```
base = total / (1 + r)
iva  = total − base
```

El total **no cambia** entre catálogo y checkout; sólo se explica.

## Arquitectura

Principio: **un solo calculador, dos consumidores.** El checkout y la factura discrepan porque son dos cálculos en dos lugares distintos (uno en el frontend, uno en `createOrder`). El diseño los colapsa en uno.

### `src/products/iva.util.ts` (nuevo)

Módulo puro, sin dependencias, única definición de la matemática del IVA:

```ts
export interface IvaBreakdown { base: number; iva: number; total: number }

fromBase(base: number, ivaType: IvaType): IvaBreakdown    // hacia adelante
fromTotal(total: number, ivaType: IvaType): IvaBreakdown  // extracción
```

**Regla de redondeo:** nunca se redondean los tres miembros por separado. Se redondean dos y el tercero sale por resta, de modo que `base + iva === total` se cumple exacto siempre.

- `fromBase`: `iva = round(base · r)`, `total = base + iva`
- `fromTotal`: `base = round(total / (1 + r))`, `iva = total − base`

### `Product` — derivación automática

Hooks `@BeforeInsert()` y `@BeforeUpdate()` derivan `iva` y `priceWithIva` en USD desde `price` + `ivaType`, usando `fromBase`. La operación es pura y no necesita tasa, así que vive en la entidad y queda blindada: ningún servicio puede guardar un producto con los derivados USD desincronizados.

Los derivados **VES se quedan a nivel de servicio** (`applyVesPrices`, refactorizado para usar `iva.util.ts`). No es un compromiso: necesitan la tasa de cambio, y congelar la tasa de registro es deliberado — es el propósito del trabajo reciente en `facturar con la tasa publicada`. Los cuatro puntos de llamada actuales ya cubren VES; el hueco era sólo USD, y el hook lo cierra.

**Restricción de los hooks.** `repository.update()` y los query builders **no disparan** `@BeforeUpdate`. Se auditaron todos los puntos de persistencia de `Product`:

| Punto | Método | Toca precio | Hook dispara |
|---|---|---|---|
| `create` (`products.service.ts:45`) | `.save()` | sí | sí |
| `updateBySku` (v1, línea 193) | `.save()` | sí | sí |
| `update` (admin, línea 250) | `.save()` | no (DTO omite `price`) | sí |
| sync de tasa (`exchange-rate-tasks.service.ts:115`) | `.save()` | sí (VES) | sí |
| `bulkPublish` / `bulkFeature` (líneas 471, 475) | `.update()` | **no** | no — inocuo |

Los únicos `.update()` sobre `products` son los masivos de `published`/`featured`, que no tocan precio; que salteen el hook es inocuo. Todo punto que sí modifica precio usa `.save()`.

**Restricción para el futuro:** cualquier código nuevo que modifique `price` o `ivaType` debe usar `.save()`. Un `.update()` por query builder saltearía la derivación y reintroduciría el defecto 2.

### `src/orders/order-pricing.service.ts` (nuevo)

Recibe items + código de descuento + tasa, devuelve el desglose completo. Dos llamadores:

- `POST /orders/quote` (nuevo) — el checkout pide el desglose sin crear nada
- `createOrder` — factura con el mismo cálculo

El número que se muestra y el que se cobra no pueden divergir por construcción.

### `CartItem`

Pasa a precio inclusivo (`priceWithIva` / `priceWithIvaVes`) para que el monto no salte entre carrito y checkout.

## El cálculo

```
Por línea i:
  lineTotal_i = priceWithIva_i × qty_i          // inclusivo: lo que vio en el catálogo

itemsTotal = Σ lineTotal_i
discount   = validateDiscount(code, itemsTotal) // opera sobre el monto inclusivo

Prorrateo del descuento:
  discount_i = round(discount × lineTotal_i / itemsTotal)
  residual   = discount − Σ discount_i          // se asigna a la línea de mayor lineTotal
  net_i      = lineTotal_i − discount_i

Extracción con la tasa propia de cada línea:
  { base_i, iva_i } = fromTotal(net_i, ivaType_i)

Totales:
  tax      = Σ iva_i
  subtotal = Σ base_i
  total    = subtotal + tax + shipping          // shipping = 0, fuera de alcance
```

### Por qué la extracción es por línea

Con tasas mixtas, extraer sobre el agregado da un resultado falso:

| | Total inclusivo | Base | IVA |
|---|---|---|---|
| Cemento (exento) | 10.00 | 10.00 | 0.00 |
| Martillo (16%) | 11.60 | 10.00 | 1.60 |
| **Correcto (por línea)** | **21.60** | **20.00** | **1.60** |
| Erróneo (16% al agregado) | 21.60 | 18.62 | 2.98 |

Se le cobraría 1.38 de IVA a un producto exento.

El código actual **ya extrae por línea correctamente** (`orders.service.ts:189-193`). Lo único roto es la suma de la línea 198.

### Invariantes

Exactos por construcción:

- `subtotal + tax === itemsTotal − discount`
- `total === itemsTotal − discount` (con `shipping = 0`)

El cliente nunca paga distinto de lo que sumó en el catálogo, menos su descuento.

### Lado VES

```
subtotalVes = round(subtotal × rate)
taxVes      = round(tax × rate)
totalVes    = subtotalVes + taxVes     // suma de las partes, NO round(total × rate)
```

`totalVes` sale de sumar sus partes para que los tres números en pantalla sumen exacto. La diferencia contra convertir el total por separado es de un céntimo como máximo; un desglose que no cuadra visualmente cuesta más que eso.

## Contrato para el frontend

### `POST /orders/quote` (nuevo)

Mismo acceso que `POST /orders` (funciona para invitados). Recibe items + código de descuento, no crea nada.

```json
{
  "exchangeRate": 245.50,
  "rateDate": "2026-07-29",
  "items": [{
    "productUuid": "...",
    "name": "Martillo 16oz",
    "sku": "MART-001",
    "quantity": 2,
    "ivaType": 0,
    "ivaRate": 16,
    "unitPrice": 11.60,
    "lineTotal": 23.20,
    "discount": 2.32,
    "base": 18.00,
    "iva": 2.88,
    "total": 20.88,
    "unitPriceVes": 2847.80,
    "totalVes": 5126.04,
    "issue": null
  }],
  "totals": {
    "itemsTotal": 23.20,
    "discount": 2.32,
    "subtotal": 18.00,
    "tax": 2.88,
    "shipping": 0.00,
    "total": 20.88,
    "subtotalVes": 4419.00,
    "taxVes": 707.04,
    "discountVes": 569.56,
    "totalVes": 5126.04
  },
  "canCheckout": true
}
```

`unitPrice` es el precio de catálogo (inclusivo). `lineTotal` es inclusivo antes de descuento. `subtotal` es base sin IVA después de descuento.

`issue` es `null` o `{ "code": "INSUFFICIENT_INVENTORY", "available": 3 }`. Otros códigos: `NOT_FOUND`, `NOT_PUBLISHED`.

### Decisiones del contrato

**El frontend no calcula nada.** Recibe `base`, `iva` y `total` desglosados, en USD y VES.

**`createOrder` nunca confía en el quote.** Recalcula desde cero con el mismo `OrderPricingService` y jamás acepta montos del cliente. Si el contrato aceptara un `total` del body, cualquiera podría postear el suyo.

**`issue` por ítem en vez de un 400.** Si un producto se queda sin stock mientras el cliente llena el formulario, un 400 le deja la página en blanco sin decirle cuál falló. Con `issue` ve el resto del pedido y `canCheckout: false` desactiva el botón.

**Deriva de tasa entre quote y submit.** Como se factura con la tasa publicada, si la tasa cambia entre que el cliente ve el desglose y confirma, el total cambia. El cliente envía opcionalmente `expectedExchangeRate`; si no coincide con la tasa de facturación, `createOrder` responde **409** con el quote nuevo en el cuerpo para que la UI pida reconfirmación. Sin esto, el reclamo "me cobraron distinto a lo que vi" es inevitable.

## Migración

Una sola migración, dos partes:

```sql
-- 1. Backfill de los derivados USD congelados
UPDATE products SET iva = ROUND(price * CASE iva_type
    WHEN 0 THEN 0.16
    WHEN 1 THEN 0
    WHEN 2 THEN 0.08
    WHEN 3 THEN 0.24
    ELSE 0
END, 2);
UPDATE products SET price_with_iva = price + iva;

-- Idem VES, por consistencia (idempotente)
UPDATE products SET iva_ves = ROUND(price_ves * CASE iva_type
    WHEN 0 THEN 0.16
    WHEN 1 THEN 0
    WHEN 2 THEN 0.08
    WHEN 3 THEN 0.24
    ELSE 0
END, 2) WHERE price_ves IS NOT NULL;
UPDATE products SET price_with_iva_ves = price_ves + iva_ves WHERE price_ves IS NOT NULL;

-- 2. Columnas nuevas para el desglose en VES
ALTER TABLE orders ADD tax_ves numeric(12,2),
                   ADD discount_amount_ves numeric(12,2);
```

Las tasas van literales en el SQL, no importadas de `IVA_RATES`: una migración es un registro histórico y debe seguir produciendo el mismo resultado si mañana cambia el enum o la alícuota legal. Es el mismo criterio que usó `AddIvaToProductsTable1776875135007`.

El `down` revierte las columnas. El backfill de precios no se revierte: recalcular valores correctos no tiene inverso significativo.

No se agrega marcador de versión de pricing. `orders.subtotal` cambia de significado (inclusivo → base sin IVA) pero **todas las órdenes actuales en producción son de prueba**, así que no hay histórico que desambiguar.

## Pruebas

| Suite | Qué cubre |
|---|---|
| `iva.util.spec.ts` | la identidad `base + iva === total` en las 4 tasas, con trampas de redondeo (montos que caen en .005, montos mínimos, 0, exento) |
| `order-pricing.service.spec.ts` | tasas mixtas, prorrateo del descuento, asignación del residual de céntimo, orden 100% exenta, descuento mayor al total (clampea a 0), un solo ítem |
| regresión explícita | un caso que reproduce el doble conteo viejo y afirma que ya no ocurre |
| hooks de `Product` | que la derivación dispare en insert y en update, incluida la ruta v1 |

Suites existentes a actualizar (afirman los totales del cálculo viejo):

- `src/orders/orders.service.createOrder.exchangeRate.spec.ts`
- `src/orders/orders.service.getPendingOrders.spec.ts`

## Fuera de alcance

- **IVA sobre el envío** — `shipping` sigue en 0 con su TODO (`orders.service.ts:176`). Los totales se diseñan para que agregarlo después no requiera rehacer el cálculo.
- **Recálculo de órdenes históricas** — se dejan intactas; son de prueba.
- **Contrato v1 del ERP** — `line_items[].total` (`orders.service.ts:1059`) sigue emitiendo montos inclusivos como hoy. Pendiente de confirmar con el equipo del ERP si esperan la convención WooCommerce (donde `total` es sin impuesto y `total_tax` va aparte).

## Riesgo operativo

Aunque no se toque el contrato v1, **el ERP verá totales distintos el día del despliegue**: `order.total` se corrige y baja ~14% en órdenes con productos gravados. Hay que avisarlo antes de desplegar.

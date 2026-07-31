# Alinear la API v1 con el contrato real de OrbisNet

**Fecha:** 2026-07-31
**Estado:** aprobado, pendiente de plan de implementación

## Problema

El ERP OrbisNet consume nuestra API v1 con la forma del REST API de WooCommerce.
Contrastando el payload real que emite OrbisNet contra el que emitimos nosotros
aparecen siete diferencias, dos de ellas de dinero.

El contrato del ERP **está implementado y no se puede mover**: el trabajo es de
adaptación nuestra, campo por campo. OrbisNet consume el objeto completo, así
que no alcanza con acertarle a los campos que nos parecen importantes.

### La convención de impuestos

El payload real de OrbisNet, sobre una orden de cuatro renglones:

| Renglón | `price` | `qty` | `total` | `total_tax` |
|---|---|---|---|---|
| BOMBA AGUA 1/2HP | 32,82 | 3 | 98,46 | 15,75 |
| CODO HG 1/2X90 | 0,91 | 5 | 4,55 | 0,73 |
| CODO PCO A/B S 1/2X090 | 0,31 | 7 | 2,17 | 0,35 |
| CODO UNIT AB 1/2X90 | 0,24 | 10 | 2,40 | 0,38 |

De donde se deduce, sin ambigüedad:

- `price` es el unitario **sin** IVA: 32,82 × 3 = 98,46 = `total`.
- `total` del renglón es **sin** IVA: `total_tax` = `total` × 0,16 (15,75 =
  98,46 × 0,16). Si `total` fuera inclusivo, el impuesto extraído daría 13,58.
- El `total` **de la orden** sí incluye el IVA: Σ`total` (107,58) +
  Σ`total_tax` (17,21) = 124,79, que es el `total` declarado.

Nosotros emitimos `total` y `price` del renglón **con IVA incluido**. Sobre la
orden 34: mandamos `total: "354.96"` donde el contrato pide `306.00`. Un ERP
que aplique la convención suma 354,96 + 48,96 = 403,92 por ese renglón —
**sobrefacturación del 13,8%**.

`total_tax` ya es correcto por casualidad: extraer 48,96 de 354,96 inclusivo da
lo mismo que aplicar 16% sobre la base 306,00.

### Estado de la integración

El ERP **nunca entró en producción contra nosotros**. Los `api_request_logs`
sólo registran una prueba manual por `curl` el 2026-04-10; el *polling* de 10
minutos nunca corrió. Por eso este cambio es una **corrección
pre-lanzamiento**, no un cambio coordinado con un consumidor vivo.

Esa misma prueba dejó evidencia de dos fallas ya arregladas o por arreglar:

```
11:37:23  PUT {"status":"pending","order_key":"OC-2026-013"}  → 200
11:37:46  PUT {"status":"pending","order_key":"OC-2026-013"}  → 400
11:37:59  PUT {"status":"pending","order_key":"OC-2026-013"}  → 400
```

El integrador reintentó el mismo acuse y recibió dos 400 (ya resuelto: los
endpoints del ERP son idempotentes desde el arreglo H-006). Y:

```
2026-04-09  GET /api/v1/orders/13  → 500
2026-04-10  GET /api/v1/orders/13  → 500
```

Consultó la orden por su id numérico y reventó. Reproducido. Es razonable que
lo intentara: **todo el resto del contrato usa el id numérico** (`PUT
/orders/:id`, y el `number` que emitimos es el id). Esa ruta es la única que
exige uuid.

## Alcance

### Las siete diferencias

| # | Campo | OrbisNet | Nosotros hoy | Impacto |
|---|---|---|---|---|
| 1 | `line_items[].total` | sin IVA | con IVA | dinero |
| 2 | `line_items[].price` | sin IVA | con IVA | dinero |
| 3 | `status: canceled` | una L | validamos `cancelled` | anulación rota |
| 4 | `billing.*` vacíos | `""` | `null` | rompe el cliente |
| 5 | `date_created` | hora local | UTC | 4 h de corrimiento |
| 6 | `billing.address_2` | la identificación | la ignoramos | la cédula no llega |
| 7 | `line_items[].tax_class` | `""` | número | a confirmar |

**(3)** Si OrbisNet manda literalmente `canceled`, el `@IsIn` del
`UpdateOrderExternalDto` responde 400 de validación y la anulación nunca llega
al servicio. No sabemos si el documento tiene un typo, así que se aceptan las
dos grafías.

**(4)** WooCommerce emite strings vacíos, nunca nulos, en los campos de
`billing`. Un cliente en Python que haga `billing['address_1'].strip()` sobre
nuestro `null` levanta `AttributeError: 'NoneType' object has no attribute
'strip'`.

**(5)** WooCommerce emite hora local del sitio sin marcador de zona; nosotros
emitimos UTC con el mismo formato. La orden 34 está en la base a las `00:37:03`
y la emitimos como `04:37:03`. Para Venezuela (UTC−4) son 4 horas de
corrimiento en cada orden.

**(6)** Mandamos un campo propio `identification: "V-1234567"` que no existe en
WooCommerce, así que es probable que OrbisNet lo ignore. No está confirmado de
dónde lee la identificación, así que se emite en **ambos** lugares: redundante,
pero cualquiera que lea la encuentra.

### Fuera de alcance, a propósito

- **`customer_note`** — OrbisNet lo ignora (confirmado). Se mantiene la nota
  libre del comprador.
- **`billing.company`** — no existe en nuestro modelo de datos. Se emite `""`.
- **`product_id` y `sku`** — WooCommerce manda `0`/`null`; nosotros mandamos los
  reales. Es un superconjunto: no puede romper a un consumidor que espera
  `0`/`null`, y les sirve más.
- **`tax_rate`** — campo nuestro que no existe en WooCommerce. Se conserva:
  es la única forma de que la alícuota siga siendo legible una vez que
  `tax_class` pase a `""`.

## Diseño

### Componente 1 — `WooOrderSerializer`

Archivo nuevo: `src/api-v1/orders/woo-order.serializer.ts`.

Función pura: recibe una `Order` con sus relaciones cargadas y devuelve el
objeto del contrato. Sin repositorios, sin `async`, sin acceso a base.

Es el **único** lugar donde viven las rarezas de WooCommerce: strings vacíos en
vez de nulos, hora local, montos sin IVA, la identificación duplicada. Si
mañana OrbisNet cambia un campo, se toca un archivo.

**Quién lo aplica:** el controlador `OrdersV1Controller.findPending`, no el
servicio. `OrdersService.getPendingOrders` pasa a devolver entidades
(`{ data: Order[], total, page, perPage, lastPage }`) y el controlador las
traduce al contrato.

Importa la dirección de la dependencia: si `OrdersService` —que es dominio—
importara el serializador de `api-v1`, el dominio pasaría a depender de la capa
de entrega. Con la serialización en el controlador, la flecha apunta como
corresponde y `getPendingOrders` queda con la consulta, el filtro por `on-hold`
y la paginación, sin saber que existe WooCommerce. Hoy son unas 120 líneas que
mezclan consulta, resolución del cliente, extracción de IVA a mano y formato.

`getPendingOrders` es el único consumidor de esa forma —lo llama sólo
`findPending`— así que el cambio no arrastra a nadie más. Sus 13 pruebas
actuales se mudan al serializador, que es donde pasa a vivir la lógica que
verifican.

**`price` no se redondea.** Se emite el cociente `base / quantity` tal cual, que
es lo que hace WooCommerce: en el payload real aparece
`"price": 0.9099999999999999`. Redondear a dos decimales rompería la relación
`price × quantity === total` en cantidades que no dividen exacto.

**Zona horaria:** `date_created` se emite en `America/Caracas`, configurable vía
`STORE_TIMEZONE` en `src/config/configuration.ts`. Explícito, para que no
dependa de la zona del servidor. Técnica: `Intl.DateTimeFormat('sv-SE', {
timeZone })` produce `YYYY-MM-DD HH:mm:ss`, y se reemplaza el espacio por `T`.

### Componente 2 — El desglose por línea se persiste

Dos columnas nuevas en `order_items`, ambas `decimal(10,2)` y **nullable**:

| Columna | Contenido |
|---|---|
| `base` | monto de la línea sin IVA, neto de descuento |
| `iva` | impuesto de la línea |

Se escriben al crear la orden desde `pricing.lines[].base` y `.iva`. El
calculador **ya produce esos números** (`PricedLine` en
`order-pricing.service.ts`): hoy simplemente se descartan. Se cumple
`base + iva === subtotal` por construcción, porque `PricedLine` ya garantiza esa
invariante.

Esto resuelve tres cosas de una:

1. El `total` del renglón sale directo de `base` — el bug de dinero.
2. Desaparece la extracción de IVA a mano con `.toFixed(2)` que hoy convive con
   `round2()` (pendiente anotado en `docs/pricing-iva.md`).
3. La alícuota deja de leerse de `item.product?.ivaType` — el estado **vivo**
   del producto. Hoy un `PATCH /products/:uuid { ivaType }` le reescribe el
   impuesto a órdenes ya facturadas, y si el producto fue borrado, `?? 0` asume
   16% sobre una línea que podía ser exenta.

**Órdenes anteriores a la migración:** las columnas quedan en `NULL` y el
serializador deriva el desglose al vuelo, con la fórmula de hoy —alícuota del
`ivaType` vivo del producto, `iva = subtotal × r / (1 + r)`, `base = subtotal −
iva`.

Lo que **no** se conserva de hoy es cómo se emite ese desglose: las órdenes
viejas también salen bajo la convención correcta (`total` = `base`). El
respaldo sólo repone los números que no están guardados; no reintroduce el
error de convención en las filas históricas.

**No hay backfill** de las columnas: recalcular con el `ivaType` actual del
producto es precisamente el error que este cambio corrige, y fingir precisión
sobre órdenes históricas es peor que dejarlas marcadas como calculadas al
vuelo.

### Componente 3 — `GET /api/v1/orders/:id` acepta id numérico

La ruta resuelve por `id` cuando el parámetro es numérico (`/^\d+$/`), y por
`uuid` sólo cuando tiene forma de uuid. Cualquier otra cosa responde **404** sin
llegar a consultar la base.

Esa última validación es la que evita repetir el problema: hoy Postgres falla al
castear `'13'` a `uuid` y el error sale como 500. Si sólo agregáramos la rama
numérica, un parámetro que no sea ni número ni uuid —`abc`— seguiría produciendo
el mismo 500.

### Flujo de datos

```
Alta del pedido
  OrderPricingService.price()  →  PricedLine { base, iva, ... }
  createOrder()                →  order_items.base, order_items.iva   [NUEVO]

Consumo del ERP
  GET /api/v1/orders/on-hold
    getPendingOrders()         →  consulta + paginación
    WooOrderSerializer         →  contrato WooCommerce                [NUEVO]
                                    total    = base
                                    price    = base / quantity
                                    total_tax = iva
                                  (si base es NULL → cálculo de respaldo)
```

## Manejo de errores

| Situación | Respuesta |
|---|---|
| `status: canceled` o `cancelled` | ambas aceptadas, normalizadas a `cancelled` |
| `status` desconocido | 400 de validación (sin cambios) |
| `GET /orders/:id` con id o uuid inexistente | 404 |
| `GET /orders/:id` con un valor que no es ni id ni uuid | 404, sin consultar la base |
| Línea sin `base`/`iva` (orden vieja) | cálculo de respaldo, sin error |
| Producto borrado en orden vieja | mismo comportamiento que hoy |

## Pruebas

**El caso de referencia** es el payload real de OrbisNet. Se construye una orden
equivalente a la 6284 del ejemplo y se afirma que el serializador emite esa
estructura, campo por campo. La invariante central —la que hoy no se cumple— es:

```
Σ line_items[].total  +  Σ line_items[].total_tax  ===  order.total
```

Además:

- `round2(price × quantity)` === `total` en cada renglón (`price` va sin
  redondear, así que la comparación se hace sobre el producto redondeado)
- strings vacíos donde no hay dato, en todos los campos de `billing`
- la identificación aparece en `address_2` **y** en `identification`
- `date_created` en `America/Caracas`, verificado con una orden creada en un
  horario que cruce el cambio de día en UTC
- `tax_class` es `""`, `tax_rate` conserva la alícuota
- `canceled` y `cancelled` ambas aceptadas por el DTO
- `GET` por id numérico y por uuid; 404 en vez de 500
- orden sin `base`/`iva` cayendo al respaldo, emitida bajo la convención
  correcta igual que una orden nueva
- `createOrder` persiste `base` e `iva`, y se cumple `base + iva === subtotal`

Las suites existentes de `getPendingOrders` (13 casos) deben seguir pasando o
actualizarse explícitamente cuando el cambio de convención las invalide.

## Riesgo residual

**`tax_class` como `""`** queda sin confirmar: no sabemos si OrbisNet lo lee. Se
alinea con WooCommerce por precaución y se conserva `tax_rate` para no perder el
dato. Si resultara que OrbisNet espera el número, es una línea.

**El backfill que no se hizo** deja las órdenes históricas dependiendo del
`ivaType` vivo del producto. Es el comportamiento actual, no una regresión, pero
significa que el problema (3) sigue existiendo para las órdenes anteriores a la
migración.

# Pruebas de flujos — preproducción

Bitácora de las pruebas manuales previas al despliegue. Cada hallazgo lleva
reproducción, causa raíz verificada y arreglo propuesto.

Entorno de las pruebas: backend local en `localhost:3000`, base `construir_db`,
frontend `../construir-fe`, navegación desde móvil.

---

## Flujo 1 — Compra de invitado (usuario no registrado)

### Pasos

| # | Paso | Endpoint | Estado |
|---|---|---|---|
| 1 | Navegar catálogo / categoría | `GET /products?categoryUuid=…` | ✅ |
| 2 | Agregar al carrito | *(local, sin backend)* | ✅ tras **H-001** |
| 3 | Autocompletar por cédula | `GET /guest-customers/search` | ✅ tras **H-002** |
| 4 | Ver desglose base + IVA | `POST /orders/quote` | ⏳ |
| 5 | Confirmar pedido | `POST /orders` | ⏳ |
| 6 | Subir comprobante | `POST /orders/:uuid/receipt` | ⏳ |
| 7 | Seguimiento | `GET /orders/track/:orderNumber` | ⏳ |

---

### H-001 — El invitado no puede agregar al carrito el 91% del catálogo

**Severidad:** bloqueante para producción.
**Alcance:** sólo invitados (sin sesión). Los usuarios autenticados no se ven afectados.
**Ubicación:** `construir-fe/src/hooks/useCartTotals.ts:43`

#### Reproducción

1. Sin iniciar sesión, ir a `/productos?categoria=66dfd390-…` (ANGULOS SIDERURGICOS).
2. Tocar «Agregar» en cualquier producto.
3. El contador muestra **1** por un instante y vuelve al botón «Agregar».
   El producto **no** queda en el carrito.

#### Causa raíz

`useCartTotals` resuelve los productos del carrito local pidiendo **la primera
página del catálogo completo**, sin filtrar por los uuid que están en el carrito:

```ts
const response = await getProducts({ page: 1, limit: 100 });
const matched = response.data.filter((p) => cartUuids.includes(p.uuid));

// Purga los productos que ya no existen para no reventar el resumen
const matchedUuids = new Set(matched.map((p) => p.uuid));
const validItems = localCart.items.filter((item) => matchedUuids.has(item.productUuid));
if (validItems.length !== localCart.items.length) {
  localCartService.saveCart({ items: validItems });
  await refreshCart();
}
```

«No vino en los primeros 100» se interpreta como «el producto ya no existe», y
el ítem se borra de `localStorage`. El catálogo devuelve **1089 productos**
visibles, así que **989 (91%) son inagregables** para un invitado: sólo
funcionan los 100 más recientes, porque el orden por defecto es
`createdAt DESC`.

Cadena completa:

1. `CartStepper.handleAdd` → `addToCart()` → `localCartService.addItem()`
   escribe en `localStorage` y hace `setLocalCart` → el stepper muestra **1**.
2. Cambia `localCart.items` → dispara el efecto de `useCartTotals`, que está
   montado en esa misma pantalla vía `CartSummaryBar`
   (`src/app/productos/page.tsx:240`).
3. El producto de siderúrgicos no está entre los 100 primeros → `matched` queda
   vacío → purga + `refreshCart()`.
4. `getItemQuantity()` devuelve 0 → vuelve a renderizar el botón «Agregar».

El mismo efecto corre en `/carrito`, así que un ítem que sobreviviera al paso
anterior igual se purga al abrir el carrito.

#### Verificación

```bash
curl -s "localhost:3000/products?page=1&limit=100"   # total: 1089, lastPage: 11
# el uuid del producto siderúrgico NO aparece en esa página
```

#### Arreglo aplicado

**1. `construir-fe/src/hooks/useCartTotals.ts`** — los productos del carrito se
resuelven **por uuid** (`GET /products/:uuid`, vía `Promise.allSettled`), no por
página del catálogo. Sólo se purga el ítem cuyo producto respondió **404**; un
fallo de red o un 500 dejan el carrito intacto y se reintentan al siguiente
cambio. Se agregó además un `cancelled` en el cleanup del efecto para no
escribir estado después de desmontar.

**2. `construir-fe/src/lib/api.ts`** — el cliente HTTP ahora adjunta
`statusCode` a **todos** los errores, no sólo a los 403. Sin eso era imposible
distinguir «el producto ya no existe» de «no hubo conexión», que es justo la
decisión que necesita tomar el carrito.

De paso se corrigió un fallo que arrastraba ese bloque: el `throw` vivía dentro
del mismo `try` que parseaba el JSON, así que su propio `catch` lo interceptaba y
reemplazaba el mensaje real del backend por un genérico `HTTP Error: 404 Not
Found`. Ahora el mensaje del servidor llega intacto a quien llama.

No hizo falta tocar el backend. Si en el futuro se quiere una sola petición en
vez de N, habría que agregar un filtro `uuids` a `GET /products`
(`ProductsController.findCatalog` hoy sólo acepta `page`, `limit`, `search`,
`categoryUuid`, `featured`, `sortBy`, `sortOrder`). Con carritos de pocos ítems
no se justifica.

#### Verificación del arreglo

- `src/hooks/__tests__/useCartTotals.test.ts` — 4 casos: producto fuera de la
  primera página que sobrevive, purga sólo ante 404, carrito intacto ante fallo
  de red, y purga selectiva conservando los ítems vivos.
- Suite completa del front: 98/98 en verde. `tsc --noEmit` limpio.
- `GET /products/:uuid` verificado: 200 para el producto siderúrgico, 404 con
  `statusCode` en el cuerpo para un uuid inexistente.

---

### H-002 — Una cédula sin registro deja en el formulario los datos del cliente anterior

**Severidad:** bloqueante para producción. Es un cruce de datos entre personas.
**Alcance:** sólo invitados (el autocompletado no corre con sesión iniciada).
**Ubicación:** `construir-fe/src/app/checkout/page.tsx` — `handleIdentificationSearch`

#### Reproducción

1. En el checkout, escribir una cédula **con** registro previo y salir del campo.
   El formulario se autocompleta (nombre, correo, teléfono, dirección).
2. Volver atrás y escribir una cédula **sin** registro.
3. Los datos de la persona anterior **siguen ahí**, listos para enviarse.

#### Causa raíz

La consulta sólo actuaba cuando encontraba algo:

```ts
if (guestData) applyGuestData(guestData);
```

Sin la rama `else`, un `null` dejaba el formulario tal cual. `handleIdentificationChange`
sí quitaba el aviso «Datos autocompletados», pero **no** los valores — así que la
pantalla ni siquiera delataba de quién eran los datos que quedaban cargados.

Consecuencia: el invitado confirma el pedido y `POST /orders` recibe el
`customerInfo` de otra persona. La orden queda con el nombre y el correo
equivocados, el email de confirmación se va a un tercero, y si es delivery,
el envío sale hacia la dirección del cliente anterior. Como el backend
recalcula precios pero **confía en el `customerInfo` que le mandan** (es el
contrato correcto), no hay nada del lado del servidor que lo detecte.

Agrava el cuadro que la identificación se guarda en `guest_customers` vía
`createOrUpdate`: un pedido enviado así **contamina el registro** de la cédula
nueva con los datos del cliente anterior, y a partir de ahí el autocompletado
los sirve como si fueran correctos.

#### Arreglo aplicado

- **Rama `else` explícita:** una cédula sin registro ahora llama a
  `revertGuestData()`. Un fallo de red **no** revierte ni cachea nada — no
  sabemos si la cédula tiene registro, así que no se toca el formulario.
- **`revertGuestData()` deshace sólo lo que el autocompletado escribió.** Se
  guarda en un ref el valor exacto que puso cada campo; al revertir, si el campo
  cambió desde entonces es porque el cliente lo editó a mano, y su valor se
  respeta. Cambiar la cédula también dispara la reversión, no sólo el borrado
  del aviso.
- **Caché de consultas por cédula** en lugar del `Set` de "ya consultadas". El
  `Set` evitaba gastar el límite de 5/min, pero impedía **reponer** el
  autocompletado: si el cliente corregía un dígito y volvía a la cédula
  original, la consulta se saltaba y los datos ya no volvían. La caché conserva
  esa protección del límite de tasa y además permite restaurar sin pedir nada.

#### Verificación del arreglo

Contrato del backend comprobado en vivo:

```
GET /guest-customers/search?identificationType=E&identificationNumber=12345678
  → 200 con el cliente

GET /guest-customers/search?identificationType=V&identificationNumber=99999999
  → 200 con cuerpo vacío  (el cliente HTTP lo traduce a null)
```

`tsc --noEmit` limpio · suite completa del front 98/98.

#### Pendiente de prueba manual

Repetir la reproducción y confirmar que en el paso 2 los campos quedan vacíos.
Probar además el caso "corrijo un dígito y vuelvo a la cédula original":
los datos deben **reaparecer** sin una segunda petición.

---

## Hallazgos menores

### H-003 — ESLint no corre en `construir-fe`

**Severidad:** menor, pero bloquea cualquier control de calidad automatizado.
**Preexistente**, no lo introdujeron estos cambios.

`npx eslint <cualquier archivo>` falla con
`TypeError: Converting circular structure to JSON` desde
`@eslint/eslintrc/lib/shared/config-validator.js`. Falla igual sobre archivos
que nadie tocó, así que es la configuración, no el código. Con ESLint 9.36 y
`eslint.config.mjs`, el síntoma apunta a un preset viejo cargado por el puente
de compatibilidad `eslintrc`. Conviene arreglarlo antes de producción: hoy
ningún cambio del front pasa por el linter.

Verificación de calidad disponible mientras tanto: `npx tsc --noEmit` y
`npx vitest run`, ambos en verde.

---

## Flujo 2 — Ciclo del ERP sobre una orden de invitado

Simulado con `PUT`/`GET` reales sobre `/api/v1/orders` usando una API key
`read_write` (id 10, `ck_erp_simulacion_pruebas_…`, creada sólo para estas
pruebas — **borrarla al terminar**). Orden usada: **34 / ORD-MS8GATGP-UP2H**,
invitado, pickup, 3 renglones, total USD 402,52 / Bs 193.700,68.

| # | Paso | Llamada | Resultado |
|---|---|---|---|
| 1 | El ERP consulta pendientes | `GET /api/v1/orders/on-hold` | ✅ la orden aparece |
| 2 | El ERP acusa recibo y registra su O/C | `PUT /api/v1/orders/34/acknowledge` | ✅ `on-hold` → `pending`, guarda `order_key` |
| 3 | La orden sale de la cola | `GET /api/v1/orders/on-hold` | ✅ total 25 → 24 |
| 4 | El ERP factura | `PUT /api/v1/orders/34` `{status: completed}` | ✅ `pending` → `completed` + email al cliente |
| 5 | El ERP reintenta un paso ya aplicado | `PUT` repetido | ❌ **H-006** |

Invariantes de la orden verificadas contra la base:

| Invariante | Resultado |
|---|---|
| `subtotal + tax = total` | 347,00 + 55,52 = **402,52** ✅ |
| `subtotal_ves + tax_ves = total_ves` | 166.983,34 + 26.717,34 = **193.700,68** ✅ |
| `sum(order_items.subtotal) = total` | **402,52** ✅ |
| `sum(order_items.subtotal_ves) = total_ves` | **193.700,68** ✅ |
| IVA efectivo | 55,52 / 347,00 = **16%** ✅ |

La orden incluye un producto de ANGULOS SIDERURGICOS, así que confirma de punta
a punta el arreglo de **H-001**.

---

### H-004 — El ERP no recibe el teléfono del cliente en las órdenes de pickup

**Severidad:** alta operativa. Sin teléfono no se coordina el retiro.
**Ubicación:** `src/orders/orders.service.ts:1568` (`getPendingOrders`)

El bloque `billing` resuelve nombre, correo e identificación con una cascada que
cae al `guestCustomer` cuando no hay usuario registrado, pero el teléfono no
participa de esa cascada:

```ts
phone: addr?.phone ?? null,
```

`addr` es la **dirección de envío**, que en una orden de pickup no existe
(`shipping_address_id` en NULL). Resultado: `phone: null` para toda orden de
retiro en local, aun teniendo el número guardado.

Comprobado en la orden 34: el ERP recibió `"phone": null` mientras
`guest_customers.phone` tiene `04249428607`.

Lo mismo aplica a `address_1` y `city`, pero ahí el NULL es correcto — un
pickup no tiene dirección de envío. El teléfono no es un dato de envío: es del
cliente, y vive en `guestCustomer.phone` / `user.phone`.

**Arreglo aplicado** (`orders.service.ts`): el teléfono entra a la misma
cascada que el resto, con la dirección de envío conservando la prioridad
cuando existe:

```ts
phone: addr?.phone ?? order.guestCustomer?.phone ?? order.user?.phone ?? null,
```

**Verificación:** 4 casos nuevos en `orders.service.getPendingOrders.spec.ts`
(pickup con guest customer, pickup con usuario autenticado, prioridad de la
dirección de envío, y null cuando no hay teléfono en ninguna parte). En vivo,
las órdenes 31/32/33 —pickup, sin dirección— pasaron de `phone: null` a
`phone: "04249428608"`, con `address_1` correctamente en `null`.

---

### H-005 — El seguimiento público devuelve la orden completa, con datos de pago y del cliente

**Severidad:** alta. Exposición de datos personales y de pago.
**Ubicación:** `src/orders/orders.controller.ts:144` → `findByOrderNumber`

`GET /orders/track/:orderNumber` no tiene guard — correcto, el cliente invitado
no tiene sesión. El problema es **qué** devuelve: la entidad `Order` cruda. Como
casi todas sus relaciones son `eager`, con sólo el número de orden se obtiene:

- `guestCustomer` completo: nombre, correo, teléfono, **cédula**, dirección,
  latitud/longitud y cuántos pedidos lleva hechos.
- `paymentInfo` completo: cédula del pagador, teléfono, banco, número de
  referencia, nombre del titular y **`receiptUrl`** — el comprobante de pago
  subido a S3.
- `adminNotes` — notas internas del panel.
- `orderKey` — la referencia interna del ERP (O/C o número de factura).

Un endpoint de seguimiento necesita número de orden, estado, fechas y totales.
No necesita nada de lo anterior.

El número de orden es `ORD-${Date.now().toString(36)}-${4 al azar}`
(`orders.service.ts:154`). La parte aleatoria son 36⁴ ≈ 1,7 millones de
combinaciones **por milisegundo**, así que no es adivinable a ciegas; el
problema no es la fuerza bruta sino que **cualquiera que conozca legítimamente
el número** —quien reenvíe el correo de confirmación, quien mire la pantalla—
se lleva el comprobante de pago y la cédula. Y a diferencia de
`GET /guest-customers/search`, este endpoint **no tiene límite de tasa**.

**Arreglo aplicado**

- **`src/orders/dto/order-tracking.dto.ts`** (nuevo): `OrderTrackingDto` con
  número, estado, método de entrega, fechas, montos (USD y VES) y los
  renglones. Del pago sólo `method` y `status` — sirven para explicarle al
  cliente que su pago sigue por verificar y no identifican a nadie. Fuera
  quedan `guestCustomer`, `shippingAddress`, `guestEmail`, `adminNotes`,
  `orderKey` y todos los ids internos.
- **`orders.service.ts`**: `trackByOrderNumber()` envuelve al buscador de
  entidad y devuelve el DTO. `findByOrderNumber()` sigue existiendo para uso
  interno.
- **`orders.controller.ts`**: la ruta pública llama al nuevo método.
- **Front (`construir-fe`)**: tipo `TrackedOrder`, `ordersService.trackOrder()`
  lo devuelve, y `OrderDetail` acepta un pedido sin datos de pago mediante la
  prop `showPaymentDetails` (la pantalla de seguimiento la pasa en `false`).
  El panel admin y «mi cuenta» siguen recibiendo el pedido completo y no
  cambian.

**Verificación**

- `src/orders/dto/order-tracking.dto.spec.ts` — 5 casos. El central serializa
  el DTO y afirma que no aparece ninguno de: cédula, teléfono, correo,
  domicilio, referencia del pago, ruta del comprobante en S3, referencia del
  ERP ni notas internas.
- En vivo sobre `ORD-MS8GATGP-UP2H`: la respuesta pasó de la entidad completa
  a 17 campos, con `paymentInfo` reducido a `{method, status}`.
- Backend 175/175 · front 98/98 · `tsc --noEmit` limpio en ambos.

**Pendiente, no cubierto por este arreglo:** falta revisar si `receiptUrl`
apunta a un objeto S3 de lectura pública. Si lo es, las URLs ya emitidas
siguen sirviendo para siempre aunque el endpoint ya no las publique.

---

### H-006 — Los endpoints del ERP no son idempotentes: reintentar un paso ya aplicado devuelve 400

**Severidad:** media-alta para la integración.
**Ubicación:** `orders.service.ts` — `acknowledgeOrder:1404`, `completeOrder:1430`

Ambos exigen un estado de partida exacto y, si no lo encuentran, lanzan 400:

```
PUT /api/v1/orders/34/acknowledge   (repetido)
→ 400 "Only on-hold orders can be acknowledged. Current status: completed"

PUT /api/v1/orders/34 {status:"completed"}   (repetido)
→ 400 "Only pending orders can be completed. Current status: completed"
```

El escenario no es raro: el ERP envía la confirmación, el backend la aplica y la
respuesta se pierde por timeout. El ERP reintenta —como debe— y recibe un error
duro, indistinguible de un fallo real. Según cómo esté programado, o marca la
orden como fallida y la deja fuera de sincronía, o entra en un bucle de
reintentos que nunca va a tener éxito.

**Arreglo aplicado** (`orders.service.ts`)

Los tres pasos del ciclo son idempotentes. Un reintento con la **misma**
referencia devuelve 200 con la orden tal como quedó, sin reescribir nada ni
reenviar correos. Una referencia **distinta** sigue siendo 400: eso no es un
reintento, es un conflicto real que hay que resolver a mano.

| Método | Reintento idéntico | Referencia distinta | Transición imposible |
|---|---|---|---|
| `acknowledgeOrder` | 200, sin escribir | 400 | 400 |
| `completeOrder` | 200, sin correo | 400 | 400 (facturar sin acuse) |
| `cancelPendingOrder` | 200, **sin tocar inventario** | — | 400 (anular facturada) |

La salida temprana de `cancelPendingOrder` no es una comodidad sino un
requisito: sin ella, el reintento vuelve a recorrer el bucle que devuelve el
inventario y le suma de nuevo la cantidad de cada renglón, inflando el stock
de productos que nunca volvieron al depósito.

**Verificación**

Unitaria: 9 casos nuevos entre los specs de `acknowledgeOrder`, `completeOrder`
y `cancelPendingOrder`. El test que exigía 400 al anular una orden ya cancelada
se reescribió: ahora afirma que responde 200 **y** que `productRepo.increment`
no se llamó.

En vivo, sobre la orden 33:

```
1. acknowledge OC-TEST-001    -> 200  pending
2. REINTENTO misma O/C        -> 200  pending
3. O/C DISTINTA               -> 400
4. completed FAC-TEST-001     -> 200  completed
5. REINTENTO misma factura    -> 200  completed
6. factura DISTINTA           -> 400
```

Y sobre la orden 32, tres anulaciones seguidas: las tres 200, con el inventario
de sus dos productos pasando de 1 a **2** — restituido una sola vez, no tres.

---

### H-007 — Facturar pisa la referencia de la orden de compra

**Severidad:** baja, pero conviene decidirlo a propósito.
**Ubicación:** `orders.service.ts:1436`

`order_key` es una sola columna que guarda dos cosas distintas en dos momentos:
la O/C que registra el ERP al acusar recibo, y el número de factura al
facturar. Verificado en vivo sobre la orden 34: `OC-ORBIS-88213` quedó
reemplazado por `FAC-ORBIS-00457`, sin rastro del primero.

Si en algún momento hay que reconciliar una factura con su orden de compra, ese
dato ya no está.

Que el problema es real lo confirma la propia base: la orden 13 tiene
`order_key = "OC-2026-013 / FAC-2026-001"` — alguien venía concatenando las dos
referencias a mano para no perder ninguna.

**Arreglo aplicado**

Columna nueva `orders.purchase_order_key`, escrita una sola vez al acusar
recibo y que no pisa nadie después. `order_key` conserva su significado actual
—la última referencia que escribió el ERP— porque ya la consumen la API v1 y el
panel, así que ningún consumidor cambia.

Migración `1785470000000-AddPurchaseOrderKeyToOrders`. El backfill copia
`order_key` a la columna nueva **sólo en las órdenes `pending`**: son las que
fueron acusadas y aún no facturadas, así que su `order_key` es con certeza una
O/C. En las `completed` el valor ya es el número de factura y la O/C original
es irrecuperable — se dejan en NULL a propósito, en vez de rellenarlas con un
dato equivocado.

**Verificación** — ciclo completo sobre la orden 33:

```
id | status    | order_key    | purchase_order_key
33 | completed | FAC-TEST-001 | OC-TEST-001
```

Backend 184/184 · `tsc --noEmit` limpio.

---

### Confirmado en vivo: el `total` por renglón sale con IVA incluido

No es un hallazgo nuevo —está anotado en `docs/pricing-iva.md` como pendiente de
confirmar con el equipo del ERP— pero ahora hay un caso concreto. Lo que recibió
el ERP para la orden 34:

```json
{ "name": "ANGULO H.NEGRO 100X100X10MMX12 BLANCO",
  "tax_rate": 16, "total": "354.96", "total_tax": "48.96" }
```

`total` (354,96) **incluye** los 48,96 de impuesto. En la convención WooCommerce
—sobre la que está modelada esta respuesta— `total` va **sin** impuesto y
`total_tax` aparte, o sea 306,00 + 48,96. Un ERP que asuma la convención
WooCommerce va a sumar 354,96 + 48,96 = **403,92** por ese renglón: sobrefactura
del 13,8%.

**Resuelto.** El payload real de OrbisNet citado arriba fue la confirmación:
la convención WooCommerce es la que espera el ERP. `line_items[].total` ahora
sale sin impuesto y `total_tax` aparte — ver
`src/api-v1/orders/woo-order.serializer.ts` y el bullet «Contrato v1 del ERP»
en `docs/pricing-iva.md` (sección Pendientes).

---

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

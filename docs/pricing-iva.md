# Precios e IVA

## Modelo

`products.price` (USD) es la **base sin IVA** y la única fuente de verdad. Es
lo que envía el sistema externo por `PUT /api/v1/products/sku/:sku`. El panel
admin no puede editar `price` — `UpdateProductDto` lo omite explícitamente —
pero **sí puede editar `ivaType`** vía `PATCH /products/:uuid`
(`ProductsService.update()`), y `ivaType` mueve `priceWithIva` tanto como
`price`: pasar un producto de `NORMAL` (16%) a `LUJO` (24%) sube su precio de
catálogo un 6.9% (`1.24 / 1.16 − 1`) sin que nadie haya tocado `price`. El
guardado usa `.save()`, así que el hook de la entidad sí recalcula.

Todo lo demás se deriva:

| Campo | Derivado de | Dónde |
|---|---|---|
| `iva`, `price_with_iva` | `price` + `iva_type` | `Product.syncUsdIvaFields()` (hook de entidad) |
| `price_ves`, `iva_ves`, `price_with_iva_ves` | `price` + `iva_type` + tasa | `applyVesPrices()` en `src/products/pricing.util.ts` |

La matemática está centralizada en `src/products/iva.util.ts`, con una excepción conocida:
`getPendingOrders` en `src/orders/orders.service.ts` reimplementa la extracción de
`total_tax` por línea a mano, usando `.toFixed(2)` en lugar de `round2()`. Hoy ambas
producen el mismo resultado (verificado sobre 800.000 montos en las cuatro alícuotas),
pero el riesgo es de desincronización futura si se toca la regla de redondeo o de
extracción en una sola de las dos versiones.

**El catálogo muestra `price_with_iva` / `price_with_iva_ves`** — el precio
completo que paga el cliente. El checkout desglosa ese mismo número hacia
atrás: `base = total / (1 + r)`, `iva = total − base`. El total no cambia
entre catálogo y checkout; sólo se explica.

## Reglas

- **Redondeo:** nunca se redondean los tres miembros de un desglose por
  separado. Se redondean dos y el tercero se **deriva** de ellos, para que
  `base + iva === total` sea exacto. En `fromBase()` el total se suma de base e IVA;
  en `fromTotal()` el IVA se resta del total. La función `round2()` implementa el
  redondeo a 2 decimales usando desplazamiento de punto decimal por texto, lo
  que evita los errores de representación binaria que sufre `Math.round()`.
  Además, `round2()` redondea a cero cualquier magnitud menor a `1e-6`: JavaScript
  imprime esos números en notación exponencial (`${9e-7}` da `"9e-7"`), lo que
  rompe el desplazamiento de punto decimal. Sin esa guarda, un cupón de monto
  fijo de 0.01 sobre un pedido con una línea muy barata metía `NaN` en el
  desglose completo. No quitar esa guarda.

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
  residuo de redondeo va a la línea de mayor monto. Cada porción se topea contra
  el monto de su propia línea: sin el tope, un cupón que cubre casi todo el
  pedido dejaba renglones con monto e IVA **negativos**. Lo insidioso era que
  los agregados del pedido seguían cuadrando, así que ninguna invariante lo
  delataba — el daño quedaba en el renglón que se persiste en `order_items`.

## Asociación de líneas con ítems

El desglose se asocia con los ítems del pedido **por posición**, nunca por UUID
de producto. Un `Map` keyed por UUID colapsa cuando el mismo producto aparece
dos veces en el pedido — algo que un carrito real produce cuando el cliente
agrega el mismo ítem en dos momentos sin fusionar cantidades. Con el `Map` por
UUID, un ítem de cantidad 1 mostraba el monto de 5 unidades y la suma de los
renglones dejaba de dar el total.

## Contrato del checkout

`POST /orders/quote` devuelve el desglose sin persistir nada. Es lo que el
frontend debe consumir para mostrar base + IVA = total; **no debe calcular el
IVA por su cuenta**.

`POST /orders` recalcula todo desde cero con el mismo `OrderPricingService` y
nunca acepta montos del cliente. Si se envía `expectedExchangeRate` y la tasa
de facturación cambió, responde **409** con el desglose nuevo. La validación de
tasa ocurre **antes de cualquier escritura persistente** (dirección de envío,
guest customer, etc.), a propósito: un cupón inválido (400, desde `price()`) o
una tasa que rotó desde el quote (409) no son casos raros — son el camino
esperado cuando el cliente tarda en completar el checkout. Si la validación
corriera después de guardar la dirección o el guest customer, cada rechazo
dejaría una fila huérfana sin orden que la referencie.

## Pendientes

- **IVA sobre el envío:** `shipping` está en 0 (TODO en
  `OrdersService.createOrder`). Cuando se implemente hay que decidir si el
  envío entra a la base gravable.

- **Contrato v1 del ERP:** `GET /api/v1/orders/on-hold` emite `line_items[].total` con
  IVA incluido. La convención WooCommerce, sobre la que está modelada esa
  respuesta, define ese campo **sin** impuesto y `total_tax` aparte. Está
  pendiente de confirmar con el equipo del ERP cuál interpretan; si esperan la
  convención WooCommerce, hoy les llega inflado y hay que corregirlo. **Además:**
  `getPendingOrders` reimplementa la extracción de IVA a mano usando `.toFixed(2)`
  en lugar de `round2()`, lo que funciona hoy pero crea riesgo de desincronización
  si la lógica de redondeo cambia. **Y, más grave que el redondeo:**
  `getPendingOrders` (`orders.service.ts`, líneas ~1286 en adelante) deriva la
  alícuota de cada línea de `item.product?.ivaType` — el estado **vivo** del
  producto — en vez del desglose que quedó persistido en `order_items` al
  crear la orden. Un `PATCH /products/:uuid { ivaType }` sobre un producto que
  ya tiene órdenes on-hold reescribe silenciosamente el impuesto de esas
  órdenes: el ERP recibe `tax_rate` y `total_tax` calculados con la alícuota
  de HOY, mientras `order.tax` (el agregado de la orden, que si vino de
  `getPendingOrders` en otro momento pudo mostrar otro número) quedó
  persistido con la alícuota de cuando se creó la orden. Si el producto se
  borra, `item.product` es `null` y `?? 0` asume 16% sobre una línea que podía
  ser exenta. Se arreglará junto con la reimplementación a mano cuando se
  confirme el contrato con el ERP: ambos hallazgos están en el mismo bloque de
  código y comparten la misma solución (leer el desglose persistido en la
  línea, no recalcularlo).

- **Carrito y precios antiguos:** las filas de `cart_items` guardadas antes de
  este cambio tienen `price` con la base sin IVA. **No se corrigen al leer el
  carrito**: `getCart()` no sincroniza precios. Sólo se corrigen con el endpoint
  explícito `POST /cart/sync-prices`, o cuando `addItem`/`updateItem` toca ese
  ítem. No afecta la facturación — `createOrder` nunca lee `item.price`, sólo
  `item.product.uuid` e `item.quantity`, y el precio se recalcula desde
  `product.priceWithIva` — así que el efecto es cosmético, en lo que muestra
  `GET /cart` antes de sincronizar.

- **Atomicidad de `createOrder`:** la función hace unas ocho escrituras
  persistentes (dirección, guest customer, payment info, order, order items,
  descuento del inventario, vaciado del carrito) **sin transacción**. Lee los
  productos sin lock antes de descontar inventario, así que dos checkouts
  concurrentes del mismo producto pueden sobrevender. Es preexistente, no lo
  introdujo este trabajo, pero conviene que quede escrito: el camino por donde
  se mueve el dinero no es atómico.

- **`POST /discounts/validate` es un segundo previsualizador de totales,
  público y sin guard** (`DiscountsController` → `DiscountsService.validateDiscount()`).
  Recibe `orderTotal` **del cliente** (no lo recalcula del carrito ni del
  catálogo), calcula el descuento con su propio `.toFixed(2)` — no pasa por
  `iva.util.ts` — y devuelve `finalTotal` / `finalTotalVes` con una conversión
  a bolívares propia, distinta de `applyVesPrices()` y de
  `OrderPricingService`. Es, en los hechos, la semántica **vieja** (pre-rama)
  de "el cliente manda el total y el backend confía en él", conviviendo con
  el previsualizador nuevo y autoritativo. Su contrato de validez también
  difiere: responde `201 {valid:false}` donde `POST /orders/quote` responde
  `400`. El frontend **no debe** usar `finalTotal` como el monto a cobrar; el
  único previsualizador autoritativo es `POST /orders/quote`. No se tocó en
  este trabajo — está fuera del alcance del plan y hay que confirmar primero
  quién lo consume antes de deprecarlo o de hacerlo delegar en el calculador
  único.

- **Techo de los montos en bolívares.** Las columnas VES (`orders.subtotal_ves`,
  `total_ves`, `tax_ves`, `discount_amount_ves`; `products.price_ves`, etc.)
  son `numeric(10, 2)`: 10 dígitos totales, 2 decimales, así que el máximo
  representable es Bs 99.999.999,99. En la base local, la tasa más reciente
  cargada es 481,22 Bs/USD (fila del 2026-04-19) — a esa tasa, el techo cae
  en unos **USD 207.800** (`99999999.99 / 481.22`), y el número exacto se
  **encoge** cada vez que la tasa sube, porque el divisor crece. Postgres
  responde a un valor por encima del techo con `numeric field overflow`, no
  trunca ni redondea. Como `orderRepository.save()` en `createOrder` ocurre
  **después** de guardar la dirección de envío y el guest customer (y después
  de crear el `paymentInfo`), un overflow en ese punto deja esas filas
  **huérfanas**: persistidas, sin ninguna orden que las referencie, y sin
  limpieza automática. Hoy es un escenario de pedido corporativo/mayorista
  fuera de lo común, pero el margen se reduce con cada devaluación.

## Órdenes históricas

Las órdenes creadas antes de este cambio tienen `subtotal` **inclusivo de
IVA** y `total` con el IVA contado dos veces. Se dejaron intactas porque todas
las órdenes en producción a esa fecha eran de prueba. No se agregó marcador de
versión.

Un pedido de 2 unidades a 11.60 USD (con producto al 16% de IVA) que antes
facturaba 26.40 pasa a facturar 23.20. El total se corrige y **baja ~12%** en
órdenes con productos gravados, porque el IVA se estaba contando dos veces. Los
dos porcentajes que circulan miden cosas distintas: el total estaba **inflado un
13.8%** respecto del correcto, y **baja un 12.1%** respecto del inflado. El
contrato de `GET /api/v1/orders/on-hold` no cambia de forma, pero los montos sí.

## Riesgo de despliegue

- **La rotación de `order.subtotal` (de inclusivo a base sin IVA) es
  observable en más superficies que sólo `GET /api/v1/orders/on-hold`.**
  Ese endpoint devuelve un DTO propio para el ERP, pero los siguientes
  devuelven la entidad `Order` **cruda**, con el mismo campo `subtotal` ya
  corregido: `GET /api/v1/orders`, `GET /api/v1/orders/:uuid` (API pública
  v1), `GET /orders`, `GET /orders/:uuid` (panel admin) y el export CSV
  (`OrdersService.exportToCSV`, columna "Subtotal"). Cualquier consumidor —
  interno o externo — que tomaba `subtotal` como "el monto a cobrar antes de
  envío" (válido antes de esta rama, porque incluía el IVA) ve una caída de
  **13.8%** el día del despliegue, sin que cambie ningún otro campo del
  contrato.

- **La analítica va a mostrar una caída de ingresos que no ocurrió.**
  `OrdersService.getDashboardStats()` calcula `revenueChangePercent`
  comparando la suma de `order.total` del mes en curso contra la del mes
  anterior. En el mes del despliegue, las órdenes del mes en curso tienen el
  IVA corregido y las del mes anterior (creadas antes del cambio) todavía
  tienen el IVA contado dos veces — así que el dashboard va a reportar una
  caída de ingresos de ~12% que es enteramente un artefacto del corte de
  versión, no una caída real de ventas. La distorsión desaparece sola un mes
  después (cuando ambos meses comparados ya están del lado corregido), pero
  el mes del cruce es un número que alguien en el negocio va a mirar y
  malinterpretar si no se lo avisa de antemano. Además, `getTopProducts()`
  cambia de base en el mismo despliegue: agrega `SUM(item.subtotal)`, que
  pasa de bruto (con IVA, antes del descuento) a neto de la porción de
  descuento de la línea — el ranking de "más vendidos por ingreso" no es
  comparable entre el mes anterior y el mes del cambio.

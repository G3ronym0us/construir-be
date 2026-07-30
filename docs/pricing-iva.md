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
  `base + iva === total` sea exacto. La función `round2()` implementa el
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

- **Contrato v1 del ERP:** `GET /api/v1/orders` emite `line_items[].total` con
  IVA incluido. La convención WooCommerce, sobre la que está modelada esa
  respuesta, define ese campo **sin** impuesto y `total_tax` aparte. Está
  pendiente de confirmar con el equipo del ERP cuál interpretan; si esperan la
  convención WooCommerce, hoy les llega inflado y hay que corregirlo.

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
contrato de `GET /api/v1/orders` no cambia de forma, pero los montos sí.

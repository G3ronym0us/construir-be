# Casos de prueba — integración Construir ↔ OrbisNet

Versión en texto del archivo `03-casos-prueba-erp.xlsx`. El Excel es el que se marca en vivo; este resumen sirve para leerlo desde el repositorio o pegarlo en un correo.

**27 casos · 135 pasos · 15 hallazgos detectados leyendo el código.**

## Antes de empezar

| Dato | Valor |
|---|---|
| Dirección del servidor (URL base) |  |
| Llave de API — clave (consumer key) |  |
| Llave de API — secreto (consumer secret) |  |
| Permisos de esa llave |  |
| Llave de SOLO LECTURA (para CP-15) |  |
| Llave de SOLO ESCRITURA (para CP-15) |  |
| Quién ejecuta las pruebas |  |
| Quién acompaña por parte del cliente |  |
| Fecha de la sesión |  |
| Tasa BCV vigente al empezar (y su fecha) |  |
| SKU del producto de prueba |  |
| Existencia (stock) inicial de ese producto |  |
| Números de pedido creados hoy |  |

### ⚠ Advertencias

- Los pedidos de prueba **descuentan inventario real**. Anotar cada número de pedido y anularlos al terminar.
- Los correos **salen de verdad**, al cliente y al administrador. Usar una dirección propia.
- Facturar dispara el correo de «pago confirmado». Anular **no envía ningún correo**.
- Anotar la existencia del producto **antes y después** de cada anulación: es la comprobación más importante.

### El flujo del ERP

```
1. Consultar pedidos nuevos : GET  /api/v1/orders/on-hold?page=1&perPage=10
2. Confirmar con su O/C     : PUT  /api/v1/orders/{id}  {"status":"pending","order_key":"OC-…"}
3. Facturar                 : PUT  /api/v1/orders/{id}  {"status":"completed","order_key":"FAC-…","date_completed":"…"}
4. Anular                   : PUT  /api/v1/orders/{id}  {"status":"cancelled","date_completed":"…"}

Autenticación: Authorization: Bearer <consumer_key>:<consumer_secret>
Estados: on-hold → pending → completed  |  on-hold o pending → cancelled
```

## A. Camino feliz

### CP-01 · Nace el pedido y el ERP lo ve en la cola

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Anotar la tasa de cambio vigente ANTES de comprar. Escribir en el papel la tasa y su fecha. | `GET {{BASE_URL}}/exchange-rates/current` | `Sin cuerpo. No hace falta llave de API.` | 200 con la tasa (rate) y la fecha de publicación (date). Ojo: la fecha puede ser de días atrás — es la fecha en que el BCV publicó esa tasa, no la de hoy. | Este endpoint es público, lo puede consultar cualquiera. | ☐ |
| 2 | En la tienda web, sin iniciar sesión, agregar al carrito 2 unidades de un producto y 1 de otro. Anotar SKU, nombre y precio de cada uno. | `Tienda web (navegador)` | `Productos con IVA normal (16%).` | El carrito muestra los 3 artículos. El precio que se ve en el catálogo YA incluye el IVA. | Anotar también la existencia (stock) de cada producto: se compara al final. | ☐ |
| 3 | Llenar el checkout como invitado: cédula, nombre, teléfono y un correo PROPIO. Elegir 'Retiro en tienda'. | `Tienda web (navegador)` | `Usar un correo al que se tenga acceso: los correos salen de verdad.` | El resumen muestra Base + IVA = Total, y la tasa del BCV con su fecha. | Si el desglose no cuadra en pantalla, detenerse acá y anotarlo. | ☐ |
| 4 | Confirmar el pedido. ⚠ Esto descuenta inventario real y dispara correos reales. | `POST {{BASE_URL}}/orders (lo hace la tienda sola)` | — | Pantalla de confirmación con el número de pedido. Llega el correo al cliente y el aviso al administrador. | ANOTAR el número de pedido (ORD-…) y el id numérico. Se usan en todos los casos siguientes. | ☐ |
| 5 | Buscar el pedido en la cola que consume el ERP. | `GET {{BASE_URL}}/api/v1/orders/on-hold?page=1&perPage=10` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200. El pedido aparece de PRIMERO (se ordenan del más nuevo al más viejo), con "status": "on-hold" y "number" igual al id. |  | ☐ |
| 6 | Revisar los datos del cliente dentro del pedido. | `GET {{BASE_URL}}/api/v1/orders/on-hold?page=1&perPage=10` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | billing.first_name / last_name / email con lo que se escribió. billing.address_2 y billing.identification = la cédula con su letra (ej. V-12345678). billing.phone con el teléfono, aunque sea retiro en tienda. NINGÚN campo de billing en null: los vacíos van como "". | Un null acá revienta al cliente de OrbisNet; por eso se emiten cadenas vacías. | ☐ |
| 7 | Revisar la fecha de creación. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | date_created en hora local de la tienda (America/Caracas), con formato 2026-08-01T14:35:02. SIN la 'Z' del final y sin desfase horario. | Si aparece con Z o con la hora de Londres, el ERP factura con la hora equivocada. | ☐ |
| 8 | Revisar cómo llega el método de entrega. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | payment_method_title = "Entrega y/o recogida en el local" (retiro) o "Envío a domicilio". | Este campo lleva el método de ENTREGA, no la forma de pago. Es a propósito: el contrato de WooCommerce no tiene otro campo donde ponerlo. | ☐ |

### CP-02 · El ERP confirma el pedido (registra su O/C)

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Confirmar la recepción del pedido registrando la orden de compra del ERP. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `{"status":"pending","order_key":"OC-PRUEBA-001"}` | 200 con el pedido: status "pending", orderKey = "OC-PRUEBA-001" y purchaseOrderKey = "OC-PRUEBA-001". | La respuesta del PUT viene con los nombres internos (orderKey, purchaseOrderKey), NO en formato WooCommerce. Es normal. | ☐ |
| 2 | Comprobar que el pedido salió de la cola. | `GET {{BASE_URL}}/api/v1/orders/on-hold?page=1&perPage=10` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | El pedido YA NO aparece en la lista. La cola sólo trae los que están en on-hold. |  | ☐ |
| 3 | Consultar el pedido puntual para ver el estado nuevo. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200 con "status": "pending". |  | ☐ |
| 4 | Probar el camino alterno con OTRO pedido en on-hold: el endpoint dedicado de confirmación. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_2}}/acknowledge` | `{"order_key":"OC-PRUEBA-002"}` | 200 y el mismo efecto: pasa a pending con su O/C registrada. | Los dos caminos llaman a la misma función. En producción conviene usar uno solo: el PUT con status=pending. | ☐ |
| 5 | Revisar los correos. | `Bandeja del cliente y del administrador` | — | NO llega ningún correo. Confirmar recibo no notifica a nadie. |  | ☐ |

### CP-03 · El ERP factura el pedido

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Anotar la existencia del producto ANTES de facturar. | `GET {{BASE_URL}}/api/v1/products/sku/{{SKU}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200. Anotar el valor de inventory. |  | ☐ |
| 2 | Facturar el pedido que quedó en pending. ⚠ Dispara correo real al cliente. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `{"status":"completed","order_key":"OC-PRUEBA-001 / FAC-0001","date_completed":"2026-08-01T15:30:00.000Z"}` | 200. status "completed"; dateCompleted con la fecha enviada; orderKey pasa a "OC-PRUEBA-001 / FAC-0001"; purchaseOrderKey SIGUE siendo "OC-PRUEBA-001". | Facturar pisa order_key con el número de factura a propósito; la O/C original queda guardada aparte en purchaseOrderKey. | ☐ |
| 3 | Revisar el correo del cliente. | `Bandeja del correo usado en el checkout` | — | Llega el correo "Confirmamos tu pago del pedido ORD-…". | Si el correo falla, la facturación NO se cae: los errores de correo se registran y se ignoran. | ☐ |
| 4 | Comprobar que facturar NO toca el inventario. | `GET {{BASE_URL}}/api/v1/products/sku/{{SKU}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | inventory exactamente igual al del paso 1. Facturar no repone ni descuenta stock. |  | ☐ |
| 5 | Ver el pedido en el formato del ERP después de facturado. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200 con "status": "completed" y los mismos montos de antes (facturar no recalcula nada). |  | ☐ |

### CP-04 · El ERP anula un pedido y vuelve el inventario

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Crear un pedido de prueba nuevo y confirmarlo con el ERP (repetir CP-01 y CP-02 con la O/C "OC-PRUEBA-003"). ⚠ Descuenta inventario. | `Tienda web + PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_3}}` | `{"status":"pending","order_key":"OC-PRUEBA-003"}` | El pedido nuevo queda en pending. ANOTAR su id. |  | ☐ |
| 2 | Anotar la existencia EXACTA del producto antes de anular. Llamarla E1. | `GET {{BASE_URL}}/api/v1/products/sku/{{SKU}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200. Escribir el número de inventory en el papel. |  | ☐ |
| 3 | Anular el pedido. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_3}}` | `{"status":"cancelled","date_completed":"2026-08-01T16:00:00.000Z"}` | 200. status "cancelled" y dateCompleted con la fecha enviada. |  | ☐ |
| 4 | Verificar que el inventario volvió. | `GET {{BASE_URL}}/api/v1/products/sku/{{SKU}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | inventory = E1 + la cantidad que tenía el pedido. Exacto, ni uno más. |  | ☐ |
| 5 | Repetir la MISMA anulación dos veces más seguidas. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_3}} (×2)` | `{"status":"cancelled","date_completed":"2026-08-01T16:00:00.000Z"}` | 200 las dos veces, y el inventario NO sigue subiendo: se queda en E1 + cantidad. | Es idempotente a propósito. Si el stock sube en cada llamada, es un fallo grave: detener la prueba. | ☐ |
| 6 | Probar la grafía con una sola L, que es la que documenta OrbisNet, sobre otro pedido. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_4}}` | `{"status":"canceled","date_completed":"2026-08-01T16:05:00.000Z"}` | 200. Se aceptan las dos escrituras: "canceled" y "cancelled". |  | ☐ |
| 7 | Revisar los correos después de anular. | `Bandeja del cliente y del administrador` | — | NO llega ningún correo, ni al cliente ni al administrador. Las anulaciones las atiende un vendedor por WhatsApp. | ⚠ El guion anterior (docs/guion-pruebas-produccion.md, paso C5) dice que sí llegan correos. El código no manda ninguno. Ver hallazgo H-07. | ☐ |

### CP-05 · Consultar un pedido puntual por id y por UUID

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Consultar el pedido por su id numérico. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200 con la forma de WooCommerce: line_items, billing, date_created, total, total_tax. NO devuelve la entidad cruda. |  | ☐ |
| 2 | Buscar el UUID del pedido en el panel de administración o en la base de datos. | `Panel admin / consulta SQL` | `SELECT id, uuid, order_number FROM orders WHERE id = {{ORDER_ID}};` | Se obtiene el uuid del pedido. | ⚠ El UUID no aparece en ningún campo de la API v1: el ERP no puede descubrirlo por su cuenta. Ver hallazgo H-03. | ☐ |
| 3 | Consultar el mismo pedido por su UUID. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_UUID}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200 con EXACTAMENTE la misma respuesta del paso 1. |  | ☐ |
| 4 | Consultar un id que no existe. | `GET {{BASE_URL}}/api/v1/orders/999999` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 404 con el mensaje "Order 999999 not found". |  | ☐ |
| 5 | Consultar algo que no es ni id ni UUID. | `GET {{BASE_URL}}/api/v1/orders/abc` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 404, NUNCA 500. | Es una regresión conocida: antes daba 500 porque Postgres no podía convertir el texto a uuid. | ☐ |

### CP-06 · Paginación de la cola y cabeceras Link

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Asegurar que hay al menos 3 pedidos en on-hold. Crear los que falten. ⚠ Cada uno descuenta inventario. | `Tienda web` | — | La cola tiene 3 o más pedidos. | Anotar los números de pedido para anularlos al final. | ☐ |
| 2 | Pedir la primera página de 2 en 2. | `GET {{BASE_URL}}/api/v1/orders/on-hold?page=1&perPage=2` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200. "data" con 2 pedidos; "total" = cantidad real de on-hold; "page": 1; "perPage": 2; "lastPage" = total dividido entre 2, redondeado hacia arriba. |  | ☐ |
| 3 | Ver las cabeceras de la respuesta (con curl -i). | `GET {{BASE_URL}}/api/v1/orders/on-hold?page=1&perPage=2` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | Aparece la cabecera Link con rel="next" y rel="last" apuntando a las páginas siguientes. | Formato RFC 5988, el mismo que usa WooCommerce. | ☐ |
| 4 | Pedir la segunda página. | `GET {{BASE_URL}}/api/v1/orders/on-hold?page=2&perPage=2` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200 con pedidos DISTINTOS a los de la página 1, y la cabecera Link ahora con rel="prev" y rel="first". |  | ☐ |
| 5 | Pedir una página que no existe. | `GET {{BASE_URL}}/api/v1/orders/on-hold?page=999&perPage=2` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200 con "data": [] (lista vacía). No es un error. |  | ☐ |
| 6 | Pedir sin parámetros, como haría el ERP por defecto. | `GET {{BASE_URL}}/api/v1/orders/on-hold` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200 con page 1 y perPage 10 por defecto. |  | ☐ |

## B. Verificación de montos

### CP-07 · El total del pedido cuadra: base + IVA = total

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Traer el pedido de prueba en formato ERP y anotar total y total_tax. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200. Anotar "total" (con IVA) y "total_tax" (el impuesto del pedido). |  | ☐ |
| 2 | Sumar a mano los line_items[].total de todas las líneas. | `Sobre la misma respuesta` | — | La suma da la BASE del pedido, sin IVA. Los renglones del ERP van SIN impuesto: es el contrato de WooCommerce. | Si un renglón trae el precio con IVA incluido, el ERP facturaría 13,8% de más. | ☐ |
| 3 | Sumar a mano los line_items[].total_tax. | `Sobre la misma respuesta` | — | La suma es IGUAL, al céntimo, al "total_tax" del pedido. |  | ☐ |
| 4 | Comprobar la identidad principal. | `Sobre la misma respuesta` | — | Σ line_items.total + Σ line_items.total_tax = total del pedido. Exacto al céntimo, sin diferencias de redondeo. | Sólo se cumple mientras el envío sea 0 (hoy lo es). Ver hallazgo H-13. | ☐ |
| 5 | Contrastar con lo que ve el cliente en el seguimiento público. | `GET {{BASE_URL}}/orders/track/{{ORDER_NUMBER}}` | `Sin llave de API: es público.` | subtotal + tax = total. Y subtotal = Σ line_items.total del ERP; tax = Σ line_items.total_tax. | El campo subtotal del pedido es la BASE sin IVA. | ☐ |
| 6 | Revisar la alícuota de cada línea. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | tax_rate es 16, 8, 0 o 24 exactos. Nunca 16,04 ni 15,98. | El sistema ajusta el cociente a la alícuota nominal más cercana, con 1 punto de tolerancia. | ☐ |
| 7 | Verificar la regla de redondeo en una línea, a mano con la calculadora. | `Sobre la misma respuesta` | — | base = redondeo a 2 decimales de (monto de la línea con IVA ÷ 1,16); iva = monto con IVA − base. NUNCA se redondean los tres números por separado. | Documentado en docs/pricing-iva.md. Por eso base + iva da el total exacto siempre. | ☐ |

### CP-08 · La tasa del pedido es la vigente al momento de la compra

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Antes de comprar, consultar la tasa y anotarla con su fecha. | `GET {{BASE_URL}}/exchange-rates/current` | `Sin llave de API.` | 200 con rate (ej. 481,22) y date (ej. 2026-04-19). | La fecha es la de publicación del BCV; puede ser anterior a hoy. | ☐ |
| 2 | Crear un pedido de prueba. ⚠ Inventario y correos reales. | `Tienda web` | — | Pedido creado. Anotar el número. |  | ☐ |
| 3 | Consultar el pedido y comparar la tasa. | `GET {{BASE_URL}}/orders/track/{{ORDER_NUMBER}}` | `Sin llave de API.` | exchangeRate = la tasa anotada en el paso 1. exchangeRateDate = la fecha de PUBLICACIÓN del BCV, no la del pedido. | Si exchangeRateDate coincidiera con la fecha del pedido cuando la tasa es vieja, sería un error. | ☐ |
| 4 | Revisar el correo de confirmación que le llegó al cliente. | `Bandeja del cliente` | — | El correo muestra la misma tasa y la misma fecha: "BCV 481,22 · 19 abr". |  | ☐ |
| 5 | Si la tasa se actualiza durante la jornada (o se fuerza una sincronización), volver a consultar el pedido viejo. | `GET {{BASE_URL}}/orders/track/{{ORDER_NUMBER}}` | `Sin llave de API.` | El pedido CONSERVA la tasa con la que se compró. Nunca se recalcula. | La tasa se congela al crear el pedido; los pedidos viejos no se tocan. | ☐ |
| 6 | Comprobar qué ve el ERP de la tasa. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | El pedido en formato ERP NO trae ni la tasa ni montos en bolívares: sólo dólares. | ⚠ Si OrbisNet factura en bolívares, la tasa la pone él y puede no ser la del pedido. Ver hallazgo H-02: confirmarlo con el cliente. | ☐ |

### CP-09 · Los montos en bolívares cuadran con los dólares por la tasa

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Traer el pedido con sus montos en bolívares. | `GET {{BASE_URL}}/orders/track/{{ORDER_NUMBER}}` | `Sin llave de API.` | 200. Anotar subtotalVes, taxVes, totalVes y exchangeRate. |  | ☐ |
| 2 | Comprobar la suma en bolívares. | `Con calculadora` | — | totalVes = subtotalVes + taxVes, exacto al céntimo. |  | ☐ |
| 3 | Comprobar una línea: monto en dólares × tasa. | `Con calculadora` | — | items[].subtotalVes ≈ items[].subtotal × tasa, con una diferencia máxima de 1 céntimo por línea (redondeo). |  | ☐ |
| 4 | Sumar los bolívares de todas las líneas. | `Con calculadora` | — | Σ items[].subtotalVes = totalVes, exacto. | Los agregados salen de sumar las líneas, para que el desglose que ve el cliente cierre. | ☐ |
| 5 | Comparar totalVes contra (total en dólares × tasa). | `Con calculadora` | — | Pueden diferir unos céntimos, y ESTÁ BIEN. Los bolívares se convierten línea por línea, no sobre el total. | Regla documentada en docs/pricing-iva.md. No reportarlo como fallo si la diferencia es de céntimos. | ☐ |
| 6 | Pedido muy grande en bolívares. | `No probar en vivo` | — | Las columnas en bolívares topan en Bs 99.999.999,99. A la tasa de hoy eso son unos USD 207.800. | ⚠ No hacer esta prueba con un pedido real: Postgres responde con error y deja filas huérfanas. Ver hallazgo H-11. | ☐ |

### CP-10 · El desglose por ítem suma el total

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Sumar los renglones del seguimiento. | `GET {{BASE_URL}}/orders/track/{{ORDER_NUMBER}}` | `Sin llave de API.` | Σ items[].subtotal = total del pedido. Ojo: el subtotal del ítem YA incluye IVA y ya viene con el descuento aplicado. |  | ☐ |
| 2 | En el formato del ERP, verificar precio × cantidad de cada línea. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | price × quantity = total de la línea (la base sin IVA). | price va sin redondear a propósito (puede verse 0.9099999999999999). No redondearlo antes de multiplicar o deja de cuadrar. | ☐ |
| 3 | Comparar sku y name de cada línea contra el producto real. | `GET {{BASE_URL}}/api/v1/products/sku/{{SKU}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | Coinciden. El sku es el que OrbisNet usa para identificar el artículo. | El nombre queda congelado al comprar: si el producto se renombra después, el pedido conserva el nombre viejo. Es correcto. | ☐ |
| 4 | Verificar las cantidades. | `Sobre la misma respuesta` | — | quantity coincide con lo que se compró en cada renglón. |  | ☐ |
| 5 | Comprar el MISMO producto en dos renglones distintos y revisar el pedido. ⚠ Pedido real. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID_5}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | Aparecen DOS renglones, cada uno con su cantidad y su monto. No se colapsan en uno solo ni se repite el monto. | Regresión conocida: antes un mismo producto en dos renglones mostraba el monto de todas las unidades en cada uno. | ☐ |
| 6 | Incluir un producto EXENTO (IVA 0%) en un pedido y revisarlo. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID_6}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | Esa línea sale con tax_rate 0 y total_tax "0.00". El IVA se calcula línea por línea, con la alícuota propia de cada producto. | Si al exento le aparece IVA, es un fallo grave de facturación. | ☐ |

### CP-11 · Pedido con cupón de descuento

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Crear o activar un cupón de prueba en el panel de administración (ej. 10%). | `Panel admin` | `Código sugerido: PRUEBA10` | El cupón queda activo y con usos disponibles. |  | ☐ |
| 2 | Previsualizar el desglose con el cupón, sin comprar todavía. | `POST {{BASE_URL}}/orders/quote` | `{"items":[{"productUuid":"{{PRODUCT_UUID}}","quantity":2}],"discountCode":"PRUEBA10"}` | 200 con el desglose: descuento, base, IVA y total ya rebajado. | Este es el único previsualizador autoritativo. No usar POST /discounts/validate para el monto a cobrar. | ☐ |
| 3 | Comprar aplicando el cupón. ⚠ Pedido real. | `Tienda web` | — | El pedido se crea con el descuento aplicado. Anotar el número y el id. |  | ☐ |
| 4 | Revisar el descuento en el seguimiento. | `GET {{BASE_URL}}/orders/track/{{ORDER_NUMBER}}` | `Sin llave de API.` | discountAmount = el descuento otorgado. subtotal + tax = total, ya neto del descuento. |  | ☐ |
| 5 | Revisar cómo le llega el pedido al ERP. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID_7}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | Las líneas vienen YA rebajadas: el descuento se reparte entre ellas, proporcional al monto de cada una. Σ total + Σ total_tax sigue dando el total del pedido. |  | ☐ |
| 6 | Revisar que ninguna línea quedó en negativo. | `Sobre la misma respuesta` | — | Ningún total ni total_tax negativo, ni siquiera con un cupón que cubra casi todo el pedido. | Fue un fallo real: el residuo del reparto dejaba renglones negativos aunque el total del pedido cuadrara. | ☐ |
| 7 | Confirmar con el cliente qué ve OrbisNet del cupón. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID_7}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | El pedido en formato ERP NO tiene ningún campo de descuento: OrbisNet no puede saber que hubo cupón, sólo ve montos ya rebajados. | ⚠ Hallazgo H-01. Preguntar en la reunión si eso les sirve para su facturación. | ☐ |
| 8 | Probar un cupón que supere el monto del pedido. | `POST {{BASE_URL}}/orders/quote` | `{"items":[{"productUuid":"{{PRODUCT_UUID}}","quantity":1}],"discountCode":"{{CUPON_GRANDE}}"}` | El descuento se topea al monto del pedido: el total queda en 0 o más, nunca negativo, y no genera saldo a favor. |  | ☐ |
| 9 | Probar un cupón vencido o inexistente. | `POST {{BASE_URL}}/orders/quote` | `{"items":[{"productUuid":"{{PRODUCT_UUID}}","quantity":1}],"discountCode":"NOEXISTE"}` | 400 con el motivo del rechazo. |  | ☐ |

### CP-12 · Envío a domicilio contra retiro en tienda

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Hacer un pedido eligiendo RETIRO EN TIENDA y revisarlo en el ERP. ⚠ Pedido real. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID_8}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | payment_method_title = "Entrega y/o recogida en el local". billing.phone con el teléfono del cliente. billing.address_1 y city pueden ir vacíos (""). | El teléfono se toma del cliente, no de la dirección: antes los pedidos de retiro llegaban sin teléfono. | ☐ |
| 2 | Hacer un pedido eligiendo ENVÍO A DOMICILIO y revisarlo. ⚠ Pedido real. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID_9}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | payment_method_title = "Envío a domicilio". billing.address_1 y billing.city con la dirección que se escribió. |  | ☐ |
| 3 | Revisar el costo de envío en los dos pedidos. | `GET {{BASE_URL}}/orders/track/{{ORDER_NUMBER}}` | `Sin llave de API.` | shipping = "0.00" en los dos casos: hoy el envío no se cobra. | Está pendiente de implementar; queda en 0 a propósito. | ☐ |
| 4 | Confirmar con el cliente qué pasa cuando se active el cobro de envío. | `Conversación` | — | El pedido en formato ERP no tiene campo ni línea de envío. Cuando se cobre envío, Σ líneas + Σ IVA dejará de dar el total. | ⚠ Hallazgo H-13. Habrá que agregar shipping_total al contrato, como hace WooCommerce. | ☐ |
| 5 | Verificar la identificación en el pedido de envío a domicilio. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID_9}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | billing.address_2 y billing.identification traen la cédula, igual que en el de retiro. | Si el cliente marcó 'crear cuenta', la cédula igual debe salir: se busca en la cuenta, en la ficha de invitado y en la dirección. | ☐ |

## C. Errores y casos borde

### CP-13 · Llamar sin llave de API

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Consultar la cola sin ninguna cabecera de autenticación. | `GET {{BASE_URL}}/api/v1/orders/on-hold` | `Sin cabeceras.` | 401 con el mensaje "Missing API credentials". |  | ☐ |
| 2 | Intentar modificar un pedido sin autenticación. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `{"status":"pending","order_key":"OC-SIN-LLAVE"}` | 401. El pedido NO se toca. |  | ☐ |
| 3 | Mandar sólo la clave, sin el secreto. | `GET {{BASE_URL}}/api/v1/orders/on-hold` | `Cabecera: Authorization: Bearer {{CK}}` | 401 "Missing API credentials". El secreto va después de los dos puntos. |  | ☐ |
| 4 | Comprobar que el pedido siguió intacto. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | El estado del pedido es el mismo de antes de estas pruebas. |  | ☐ |

### CP-14 · Llamar con llave inválida o desactivada

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Usar una clave que no existe. | `GET {{BASE_URL}}/api/v1/orders/on-hold` | `Cabecera: Authorization: Bearer ck_inventada:cs_inventado` | 401 con el mensaje "Invalid API credentials". |  | ☐ |
| 2 | Usar la clave correcta con el secreto equivocado. | `GET {{BASE_URL}}/api/v1/orders/on-hold` | `Cabecera: Authorization: Bearer {{CK}}:secreto-malo` | 401 "Invalid API credentials". |  | ☐ |
| 3 | Desactivar una llave en el panel y volver a usarla. | `GET {{BASE_URL}}/api/v1/orders/on-hold` | `Cabecera con la llave desactivada.` | 401 "Invalid API credentials". Una llave desactivada se comporta igual que una que no existe. | Es la palanca para cortarle el acceso al ERP en caliente. Volver a activarla al terminar. | ☐ |
| 4 | Probar la forma alterna de autenticación por cabeceras separadas. | `GET {{BASE_URL}}/api/v1/orders/on-hold` | `Cabeceras: x-consumer-key: {{CK}} y x-consumer-secret: {{CS}}` | 200. Es equivalente al Bearer. | ⚠ También se aceptan como parámetros en la URL (?consumer_key=…&consumer_secret=…), pero eso deja las credenciales escritas en los registros del servidor. NO usar esa forma. Hallazgo H-09. | ☐ |

### CP-15 · Permisos de la llave: lectura contra escritura

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Con una llave de SOLO LECTURA, consultar la cola. | `GET {{BASE_URL}}/api/v1/orders/on-hold` | `Cabecera con la llave de solo lectura.` | 200. Leer sí puede. |  | ☐ |
| 2 | Con la MISMA llave de solo lectura, intentar confirmar un pedido. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `{"status":"pending","order_key":"OC-SOLO-LECTURA"}` | 403 con el mensaje "Insufficient permissions". El pedido no cambia. |  | ☐ |
| 3 | Con una llave de SOLO ESCRITURA, intentar consultar la cola. | `GET {{BASE_URL}}/api/v1/orders/on-hold` | `Cabecera con la llave de solo escritura.` | 403 "Insufficient permissions". | ⚠ No hay jerarquía: "escritura" NO incluye "lectura". La llave del ERP tiene que ser de lectura y escritura. Hallazgo H-06. | ☐ |
| 4 | Con la llave de LECTURA Y ESCRITURA (la del ERP), probar las dos cosas. | `GET y PUT sobre {{BASE_URL}}/api/v1/orders/…` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200 en las dos. Confirmar que la llave que va a usar OrbisNet en producción es de este tipo. | Anotar en la hoja de Instrucciones qué permiso tiene la llave usada hoy. | ☐ |

### CP-16 · Confirmar sin la orden de compra (order_key)

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Intentar confirmar un pedido sin mandar order_key. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `{"status":"pending"}` | 400 con el mensaje "order_key is required when status is pending". | El mensaje es claro y dice exactamente qué falta. | ☐ |
| 2 | Intentar con la orden de compra vacía. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `{"status":"pending","order_key":""}` | 400. La validación rechaza el texto vacío. |  | ☐ |
| 3 | Comprobar que el pedido no se movió. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | Sigue en "on-hold". |  | ☐ |

### CP-17 · Facturar sin los datos obligatorios

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Facturar sin la fecha. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `{"status":"completed","order_key":"FAC-0001"}` | 400 "date_completed is required when status is completed". |  | ☐ |
| 2 | Facturar sin el número de factura. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `{"status":"completed","date_completed":"2026-08-01T16:00:00.000Z"}` | 400 "order_key is required when status is completed". |  | ☐ |
| 3 | Comprobar que no pasó nada. | `GET {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | El pedido sigue en "pending" y NO llegó el correo de pago confirmado. |  | ☐ |

### CP-18 · Anular sin la fecha

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Anular sin mandar date_completed. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `{"status":"cancelled"}` | 400 "date_completed is required when status is cancelled". |  | ☐ |
| 2 | Lo mismo con la grafía de una sola L. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `{"status":"canceled"}` | 400 con el mismo mensaje. |  | ☐ |
| 3 | Comprobar el inventario. | `GET {{BASE_URL}}/api/v1/products/sku/{{SKU}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | El stock NO se movió: la anulación se rechazó antes de tocar nada. |  | ☐ |

### CP-19 · Trabajar sobre un pedido que no existe

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Confirmar un id inexistente. | `PUT {{BASE_URL}}/api/v1/orders/999999` | `{"status":"pending","order_key":"OC-FANTASMA"}` | 404 "Order with id 999999 not found". |  | ☐ |
| 2 | Anular un id inexistente. | `PUT {{BASE_URL}}/api/v1/orders/999999` | `{"status":"cancelled","date_completed":"2026-08-01T16:00:00.000Z"}` | 404 con el mismo tipo de mensaje. |  | ☐ |
| 3 | Probar con el id 0. | `PUT {{BASE_URL}}/api/v1/orders/0` | `{"status":"pending","order_key":"OC-CERO"}` | 404: es un número válido, pero no existe ningún pedido 0. |  | ☐ |

### CP-20 · Id que no es un número

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Mandar un id con letras. | `PUT {{BASE_URL}}/api/v1/orders/abc` | `{"status":"pending","order_key":"OC-X"}` | 400 "Validation failed (numeric string is expected)". |  | ☐ |
| 2 | Mandar el UUID del pedido en el PUT. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_UUID}}` | `{"status":"pending","order_key":"OC-X"}` | 400, AUNQUE el GET con ese mismo UUID sí funciona. | ⚠ Asimetría del contrato: el GET acepta id o UUID, el PUT sólo id numérico. Hallazgo H-03. | ☐ |
| 3 | Mandar un id con decimales. | `PUT {{BASE_URL}}/api/v1/orders/12.5` | `{"status":"pending","order_key":"OC-X"}` | 400. |  | ☐ |

### CP-21 · Confirmar dos veces el mismo pedido (idempotencia)

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Con un pedido en on-hold, confirmarlo. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_10}}` | `{"status":"pending","order_key":"OC-IDEM-01"}` | 200 y pasa a "pending". |  | ☐ |
| 2 | Repetir la llamada IDÉNTICA. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_10}}` | `{"status":"pending","order_key":"OC-IDEM-01"}` | 200 y devuelve el pedido tal como quedó, sin reescribir nada. | Es a propósito: si el ERP escribe bien pero pierde la respuesta por un corte, reintenta — y un error ahí lo dejaría desincronizado. | ☐ |
| 3 | Repetir con una orden de compra DISTINTA. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_10}}` | `{"status":"pending","order_key":"OC-IDEM-02"}` | 400 "Only on-hold orders can be acknowledged. Current status: pending". | Eso no es un reintento: son dos órdenes de compra peleando por el mismo pedido. Se resuelve a mano. | ☐ |
| 4 | Facturar ese pedido y DESPUÉS repetir la confirmación con la O/C original. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_10}}` | `{"status":"pending","order_key":"OC-IDEM-01"}` | 200, y el pedido SIGUE en "completed": no vuelve a pending. | ⚠ El 200 no significa "quedó en pending". Si el ERP lo interpreta así, se desincroniza. Confirmarlo con el integrador. Hallazgo H-14. | ☐ |
| 5 | Anular un pedido y luego intentar confirmarlo con su misma O/C. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_11}}` | `{"status":"pending","order_key":"OC-IDEM-03"}` | 400 "Only on-hold orders can be acknowledged. Current status: cancelled". | Un pedido anulado no se puede resucitar con un acuse tardío. Es correcto que falle. | ☐ |

### CP-22 · Facturar un pedido que no está en pendiente

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Intentar facturar un pedido YA ANULADO. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_3}}` | `{"status":"completed","order_key":"FAC-9999","date_completed":"2026-08-01T17:00:00.000Z"}` | 400 "Only pending orders can be completed. Current status: cancelled". No se envía correo ni se cambia nada. |  | ☐ |
| 2 | Intentar facturar un pedido que sigue en on-hold (nunca se confirmó). | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_12}}` | `{"status":"completed","order_key":"FAC-8888","date_completed":"2026-08-01T17:00:00.000Z"}` | 400 "… Current status: on-hold". | Hay que confirmar recibo (pending) antes de facturar. El orden de los pasos es obligatorio. | ☐ |
| 3 | Refacturar un pedido ya facturado con el MISMO número de factura. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `{"status":"completed","order_key":"OC-PRUEBA-001 / FAC-0001","date_completed":"2026-08-01T15:30:00.000Z"}` | 200 y devuelve el pedido tal cual, SIN reescribir y SIN volver a mandar el correo al cliente. | Verificar en la bandeja que no llegó un segundo correo. | ☐ |
| 4 | Refacturar con OTRO número de factura. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `{"status":"completed","order_key":"FAC-DISTINTA","date_completed":"2026-08-01T17:10:00.000Z"}` | 400. Dos facturas distintas sobre el mismo pedido se resuelven a mano. |  | ☐ |

### CP-23 · Anular un pedido que no corresponde

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Intentar anular un pedido YA FACTURADO. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID}}` | `{"status":"cancelled","date_completed":"2026-08-01T17:20:00.000Z"}` | 400 "Order cannot be cancelled. Current status: completed". | Un pedido facturado sólo se revierte por nota de crédito en el ERP, no por esta vía. | ☐ |
| 2 | Comprobar que el inventario no se movió con ese intento. | `GET {{BASE_URL}}/api/v1/products/sku/{{SKU}}` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | El stock quedó igual: el rechazo ocurre antes de devolver nada. |  | ☐ |
| 3 | Anular un pedido que está en on-hold, sin haberlo confirmado nunca. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_12}}` | `{"status":"cancelled","date_completed":"2026-08-01T17:25:00.000Z"}` | 200: SÍ se puede anular directo desde on-hold, y el inventario vuelve. | Es el camino para deshacer un pedido que el ERP nunca llegó a tomar. | ☐ |
| 4 | Anular dos veces seguidas ese mismo pedido y revisar el stock después de cada llamada. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_12}} (×2) + GET del producto` | `{"status":"cancelled","date_completed":"2026-08-01T17:25:00.000Z"}` | 200 las dos veces y el inventario vuelve UNA sola vez. | Es la prueba más importante de todas: si el stock sube dos veces, se infla el inventario de mercancía que nunca volvió al depósito. | ☐ |

### CP-24 · Fecha de facturación mal escrita

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Mandar la fecha en formato venezolano. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_13}}` | `{"status":"cancelled","date_completed":"01/08/2026"}` | 400: se exige el formato ISO 8601 (2026-08-01T16:00:00.000Z). |  | ☐ |
| 2 | Mandar una fecha imposible. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_13}}` | `{"status":"cancelled","date_completed":"2026-13-45T10:00:00Z"}` | 400. |  | ☐ |
| 3 | Mandar la fecha vacía. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_13}}` | `{"status":"cancelled","date_completed":""}` | 400. |  | ☐ |
| 4 | Mandar sólo la fecha, sin la hora. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_13}}` | `{"status":"cancelled","date_completed":"2026-08-01"}` | ⚠ SE ACEPTA (200) y se guarda como medianoche UTC, o sea el 31/07 a las 8:00 pm hora de Venezuela. | ⚠ Posible hueco — verificar cómo lo muestra el panel y si a OrbisNet le sirve. Hallazgo H-08. | ☐ |
| 5 | Mandar texto libre. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_13}}` | `{"status":"cancelled","date_completed":"hoy"}` | 400. |  | ☐ |
| 6 | Mandar una fecha del futuro lejano. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_13}}` | `{"status":"cancelled","date_completed":"2030-01-01T00:00:00.000Z"}` | ⚠ SE ACEPTA (200): no se valida que la fecha sea razonable. | ⚠ Posible hueco — verificar. Si al cliente le molesta, anotarlo. Hallazgo H-08. | ☐ |

### CP-25 · Cuerpo del mensaje mal armado

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Mandar un estado que no existe en el contrato. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_13}}` | `{"status":"shipped","order_key":"X"}` | 400: sólo se aceptan pending, completed, cancelled y canceled. |  | ☐ |
| 2 | Mandar el cuerpo vacío. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_13}}` | `{}` | 400 por falta del campo status. |  | ☐ |
| 3 | Mandar un campo de más. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_13}}` | `{"status":"pending","order_key":"OC-1","customer_note":"algo"}` | 400 "property customer_note should not exist". | ⚠ El contrato es estricto: si OrbisNet manda campos extra (como haría un cliente de WooCommerce), TODA la llamada falla. Confirmarlo con el integrador. Hallazgo H-05. | ☐ |
| 4 | Mandar el estado en mayúsculas. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_13}}` | `{"status":"PENDING","order_key":"OC-1"}` | 400: distingue mayúsculas de minúsculas. |  | ☐ |
| 5 | Mandar sin la cabecera Content-Type: application/json. | `PUT {{BASE_URL}}/api/v1/orders/{{ORDER_ID_13}}` | `Mismo cuerpo, sin Content-Type.` | Se espera 400 (el cuerpo llega vacío y falla la validación). Anotar el código exacto que devuelva. | ⚠ Verificar en vivo. | ☐ |

### CP-26 · Paginación con valores exagerados o raros

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Pedir cien mil registros por página y medir cuánto tarda. | `GET {{BASE_URL}}/api/v1/orders/on-hold?perPage=100000` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200 y devuelve TODOS los pedidos en on-hold de un solo golpe. Anotar el tiempo de respuesta. | ⚠ No hay tope de perPage. Con muchos pedidos, el ERP puede tumbar el servidor sin querer. Hallazgo H-04. | ☐ |
| 2 | Mandar un perPage con letras. | `GET {{BASE_URL}}/api/v1/orders/on-hold?perPage=abc` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 400 "Validation failed (numeric string is expected)". |  | ☐ |
| 3 | Mandar perPage en cero. | `GET {{BASE_URL}}/api/v1/orders/on-hold?perPage=0` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | ⚠ VERIFICAR EN VIVO: puede devolver TODOS los pedidos y un lastPage nulo o infinito. Anotar exactamente qué respondió. | ⚠ Posible hueco — no hay validación de mínimo. Hallazgo H-05. | ☐ |
| 4 | Mandar la página en cero. | `GET {{BASE_URL}}/api/v1/orders/on-hold?page=0&perPage=10` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | ⚠ VERIFICAR EN VIVO: el salto queda negativo y puede responder 500. Anotar el código real. | ⚠ Posible hueco — no hay validación de mínimo. Hallazgo H-05. | ☐ |
| 5 | Mandar la página negativa. | `GET {{BASE_URL}}/api/v1/orders/on-hold?page=-1&perPage=10` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | ⚠ VERIFICAR EN VIVO: mismo riesgo que el paso anterior. | ⚠ Posible hueco. Hallazgo H-05. | ☐ |
| 6 | Después de todo lo anterior, volver a la consulta normal. | `GET {{BASE_URL}}/api/v1/orders/on-hold?page=1&perPage=10` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200 normal: el servidor sigue en pie y responde igual que al principio. | Si acá falla, el servidor quedó afectado por las pruebas anteriores: anotarlo como bloqueante. | ☐ |

### CP-27 · Endpoints que el ERP NO debe usar

| # | Qué hacer | Petición | Datos | Resultado esperado | Observaciones | OK |
|---|---|---|---|---|---|---|
| 1 | Consultar el listado general de pedidos con la llave del ERP. | `GET {{BASE_URL}}/api/v1/orders?page=1&perPage=5` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | 200, pero devuelve el pedido CRUDO (no el formato WooCommerce), con datos personales, dirección y datos del pago de todos los pedidos. | ⚠ Una llave de solo lectura ve todo eso. Hallazgo H-10. | ☐ |
| 2 | Confirmar con el integrador qué endpoints consume OrbisNet. | `Conversación` | — | OrbisNet debe usar SOLO: GET /api/v1/orders/on-hold, GET /api/v1/orders/:id y PUT /api/v1/orders/:id. | Dejarlo escrito en la minuta de la reunión. | ☐ |
| 3 | Medir el tiempo del listado general con la base llena. | `GET {{BASE_URL}}/api/v1/orders?page=1&perPage=5` | `Cabecera: Authorization: Bearer {{CK}}:{{CS}}` | Anotar el tiempo: este endpoint trae TODOS los pedidos de la base y recién después corta la página en memoria. | ⚠ Se degrada con el tiempo. Hallazgo H-10. | ☐ |

## Comandos curl

### Autenticación — Todos

Así se autentica cada llamada. La llave del ERP debe tener permiso de lectura Y escritura.

```bash
export BASE_URL="https://api.construir.com"
export CK="{{CONSUMER_KEY}}"
export CS="{{CONSUMER_SECRET}}"

# Forma 1 (la que usa OrbisNet):
#   -H "Authorization: Bearer $CK:$CS"
# Forma 2 (equivalente):
#   -H "x-consumer-key: $CK" -H "x-consumer-secret: $CS"
```

### CP-01 — Ver la cola de pedidos nuevos

Lo que el ERP consulta cada 10 minutos.

```bash
curl -s -H "Authorization: Bearer $CK:$CS" \
  "$BASE_URL/api/v1/orders/on-hold?page=1&perPage=10" | python3 -m json.tool
```

### CP-01 — Tasa de cambio vigente (público)

Para anotar la tasa antes de comprar.

```bash
curl -s "$BASE_URL/exchange-rates/current" | python3 -m json.tool
```

### CP-02 — Confirmar el pedido con la orden de compra

Paso 2 del flujo del ERP.

```bash
curl -s -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" \
  -d '{"status":"pending","order_key":"OC-PRUEBA-001"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}" | python3 -m json.tool
```

### CP-02 — Confirmar por el endpoint dedicado

Camino alterno, mismo efecto.

```bash
curl -s -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" \
  -d '{"order_key":"OC-PRUEBA-002"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}/acknowledge" | python3 -m json.tool
```

### CP-03 — Facturar el pedido

Paso 3 del flujo. ⚠ Manda correo real al cliente.

```bash
curl -s -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","order_key":"OC-PRUEBA-001 / FAC-0001","date_completed":"2026-08-01T15:30:00.000Z"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}" | python3 -m json.tool
```

### CP-04 — Anular el pedido

Paso 4 del flujo. Devuelve el inventario.

```bash
curl -s -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" \
  -d '{"status":"cancelled","date_completed":"2026-08-01T16:00:00.000Z"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}" | python3 -m json.tool
```

### CP-04 — Anular con la grafía de OrbisNet (una sola L)

Se aceptan las dos escrituras.

```bash
curl -s -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" \
  -d '{"status":"canceled","date_completed":"2026-08-01T16:05:00.000Z"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}" | python3 -m json.tool
```

### CP-04 — Ver el inventario de un producto

Para comparar el stock antes y después de anular.

```bash
curl -s -H "Authorization: Bearer $CK:$CS" \
  "$BASE_URL/api/v1/products/sku/{{SKU}}" \
  | python3 -c "import sys,json; p=json.load(sys.stdin); print(p['sku'], p['name'], 'stock:', p['inventory'])"
```

### CP-05 — Consultar un pedido por id

Devuelve el formato WooCommerce.

```bash
curl -s -H "Authorization: Bearer $CK:$CS" \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}" | python3 -m json.tool
```

### CP-05 — Consultar un pedido por UUID

Misma respuesta que por id.

```bash
curl -s -H "Authorization: Bearer $CK:$CS" \
  "$BASE_URL/api/v1/orders/{{ORDER_UUID}}" | python3 -m json.tool
```

### CP-05 — Id inexistente y texto que no es id (deben dar 404)

Nunca deben dar 500.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $CK:$CS" \
  "$BASE_URL/api/v1/orders/999999"
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $CK:$CS" \
  "$BASE_URL/api/v1/orders/abc"
```

### CP-06 — Paginación con las cabeceras Link a la vista

La opción -i muestra las cabeceras.

```bash
curl -s -i -H "Authorization: Bearer $CK:$CS" \
  "$BASE_URL/api/v1/orders/on-hold?page=1&perPage=2" | head -30
```

### CP-07 — Comprobar que los montos cuadran, automático

Suma las líneas y compara con el total del pedido.

```bash
curl -s -H "Authorization: Bearer $CK:$CS" "$BASE_URL/api/v1/orders/{{ORDER_ID}}" \
  | python3 -c "
import sys, json
o = json.load(sys.stdin)
base = sum(float(i['total']) for i in o['line_items'])
iva  = sum(float(i['total_tax']) for i in o['line_items'])
print('base :', round(base, 2))
print('iva  :', round(iva, 2), ' total_tax del pedido:', o['total_tax'])
print('suma :', round(base + iva, 2), ' total del pedido:', o['total'])
print('CUADRA' if abs(base + iva - float(o['total'])) < 0.005 else 'NO CUADRA')
print('alicuotas:', [i['tax_rate'] for i in o['line_items']])
"
```

### CP-08 — Ver la tasa y los bolívares del pedido (público)

El seguimiento sí trae la tasa; el formato ERP no.

```bash
curl -s "$BASE_URL/orders/track/{{ORDER_NUMBER}}" | python3 -m json.tool
```

### CP-09 — Comprobar los bolívares, automático

Verifica que totalVes = subtotalVes + taxVes.

```bash
curl -s "$BASE_URL/orders/track/{{ORDER_NUMBER}}" \
  | python3 -c "
import sys, json
t = json.load(sys.stdin)
f = lambda v: float(v) if v is not None else 0.0
print('tasa:', t['exchangeRate'], 'fecha de la tasa:', t['exchangeRateDate'])
print('USD :', t['subtotal'], '+', t['tax'], '=', t['total'])
print('Bs  :', t['subtotalVes'], '+', t['taxVes'], '=', t['totalVes'])
print('cuadra Bs:', abs(f(t['subtotalVes']) + f(t['taxVes']) - f(t['totalVes'])) < 0.005)
print('suma renglones Bs:', round(sum(f(i['subtotalVes']) for i in t['items']), 2))
"
```

### CP-11 — Previsualizar un pedido con cupón, sin comprar

El único previsualizador válido.

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"items":[{"productUuid":"{{PRODUCT_UUID}}","quantity":2}],"discountCode":"PRUEBA10"}' \
  "$BASE_URL/orders/quote" | python3 -m json.tool
```

### CP-13 — Sin llave (debe dar 401)

```bash
curl -s -o /dev/null -w "%{http_code}\n" "$BASE_URL/api/v1/orders/on-hold"
```

### CP-14 — Llave inválida (debe dar 401)

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer ck_inventada:cs_inventado" \
  "$BASE_URL/api/v1/orders/on-hold"
```

### CP-14 — Autenticación por cabeceras separadas (debe dar 200)

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "x-consumer-key: $CK" -H "x-consumer-secret: $CS" \
  "$BASE_URL/api/v1/orders/on-hold"
```

### CP-15 — Llave de solo lectura escribiendo (debe dar 403)

Reemplazar CK_RO/CS_RO por la llave de solo lectura.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PUT \
  -H "Authorization: Bearer {{CK_RO}}:{{CS_RO}}" \
  -H "Content-Type: application/json" \
  -d '{"status":"pending","order_key":"OC-SOLO-LECTURA"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}"
```

### CP-16 — Confirmar sin order_key (debe dar 400)

```bash
curl -s -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" -d '{"status":"pending"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}"
```

### CP-17 — Facturar sin date_completed (debe dar 400)

```bash
curl -s -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","order_key":"FAC-0001"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}"
```

### CP-18 — Anular sin date_completed (debe dar 400)

```bash
curl -s -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" -d '{"status":"cancelled"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}"
```

### CP-19 — Pedido inexistente (debe dar 404)

```bash
curl -s -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" \
  -d '{"status":"pending","order_key":"OC-FANTASMA"}' \
  "$BASE_URL/api/v1/orders/999999"
```

### CP-20 — Id no numérico y UUID en el PUT (deben dar 400)

El GET sí acepta UUID; el PUT no.

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" -d '{"status":"pending","order_key":"OC-X"}' \
  "$BASE_URL/api/v1/orders/abc"
curl -s -o /dev/null -w "%{http_code}\n" -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" -d '{"status":"pending","order_key":"OC-X"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_UUID}}"
```

### CP-21 — Doble confirmación: misma O/C y O/C distinta

La primera repetición da 200; con otra O/C da 400.

```bash
curl -s -o /dev/null -w "1a: %{http_code}\n" -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" -d '{"status":"pending","order_key":"OC-IDEM-01"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}"
curl -s -o /dev/null -w "2a: %{http_code}\n" -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" -d '{"status":"pending","order_key":"OC-IDEM-01"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}"
curl -s -o /dev/null -w "otra O/C: %{http_code}\n" -X PUT -H "Authorization: Bearer $CK:$CS" \
  -H "Content-Type: application/json" -d '{"status":"pending","order_key":"OC-IDEM-02"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}"
```

### CP-23 — Anular dos veces y mirar el stock entre medio

El inventario debe volver una sola vez.

```bash
curl -s -H "Authorization: Bearer $CK:$CS" "$BASE_URL/api/v1/products/sku/{{SKU}}" \
  | python3 -c "import sys,json; print('antes :', json.load(sys.stdin)['inventory'])"
curl -s -o /dev/null -X PUT -H "Authorization: Bearer $CK:$CS" -H "Content-Type: application/json" \
  -d '{"status":"cancelled","date_completed":"2026-08-01T17:25:00.000Z"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}"
curl -s -H "Authorization: Bearer $CK:$CS" "$BASE_URL/api/v1/products/sku/{{SKU}}" \
  | python3 -c "import sys,json; print('1a anulacion:', json.load(sys.stdin)['inventory'])"
curl -s -o /dev/null -X PUT -H "Authorization: Bearer $CK:$CS" -H "Content-Type: application/json" \
  -d '{"status":"cancelled","date_completed":"2026-08-01T17:25:00.000Z"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}"
curl -s -H "Authorization: Bearer $CK:$CS" "$BASE_URL/api/v1/products/sku/{{SKU}}" \
  | python3 -c "import sys,json; print('2a anulacion:', json.load(sys.stdin)['inventory'])"
```

### CP-24 — Fechas mal escritas y fecha sin hora

Las tres primeras dan 400; la cuarta se acepta.

```bash
for F in "01/08/2026" "2026-13-45T10:00:00Z" "hoy" "2026-08-01"; do
  echo -n "$F -> "
  curl -s -o /dev/null -w "%{http_code}\n" -X PUT -H "Authorization: Bearer $CK:$CS" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"cancelled\",\"date_completed\":\"$F\"}" \
    "$BASE_URL/api/v1/orders/{{ORDER_ID}}"
done
```

### CP-25 — Estado inválido, cuerpo vacío y campo de más

Los tres deben dar 400.

```bash
curl -s -X PUT -H "Authorization: Bearer $CK:$CS" -H "Content-Type: application/json" \
  -d '{"status":"shipped","order_key":"X"}' "$BASE_URL/api/v1/orders/{{ORDER_ID}}"
curl -s -X PUT -H "Authorization: Bearer $CK:$CS" -H "Content-Type: application/json" \
  -d '{}' "$BASE_URL/api/v1/orders/{{ORDER_ID}}"
curl -s -X PUT -H "Authorization: Bearer $CK:$CS" -H "Content-Type: application/json" \
  -d '{"status":"pending","order_key":"OC-1","customer_note":"algo"}' \
  "$BASE_URL/api/v1/orders/{{ORDER_ID}}"
```

### CP-26 — Paginación abusiva: perPage enorme, cero y página negativa

Anotar el código y el tiempo de cada una.

```bash
curl -s -o /dev/null -w "perPage=100000 -> %{http_code} en %{time_total}s\n" \
  -H "Authorization: Bearer $CK:$CS" "$BASE_URL/api/v1/orders/on-hold?perPage=100000"
curl -s -o /dev/null -w "perPage=abc -> %{http_code}\n" \
  -H "Authorization: Bearer $CK:$CS" "$BASE_URL/api/v1/orders/on-hold?perPage=abc"
curl -s -w "\nperPage=0 -> %{http_code}\n" \
  -H "Authorization: Bearer $CK:$CS" "$BASE_URL/api/v1/orders/on-hold?perPage=0" | head -5
curl -s -o /dev/null -w "page=0 -> %{http_code}\n" \
  -H "Authorization: Bearer $CK:$CS" "$BASE_URL/api/v1/orders/on-hold?page=0&perPage=10"
curl -s -o /dev/null -w "page=-1 -> %{http_code}\n" \
  -H "Authorization: Bearer $CK:$CS" "$BASE_URL/api/v1/orders/on-hold?page=-1&perPage=10"
```

### CP-27 — Listado general (el que el ERP NO debe usar)

Devuelve el pedido crudo con datos personales.

```bash
curl -s -o /dev/null -w "%{http_code} en %{time_total}s\n" \
  -H "Authorization: Bearer $CK:$CS" "$BASE_URL/api/v1/orders?page=1&perPage=5"
```

### Cierre — Comprobaciones en base de datos

Con <N> = id del pedido de prueba.

```bash
-- Los montos cuadran
SELECT subtotal, tax, total, subtotal + tax = total AS cuadra,
       subtotal_ves, tax_ves, total_ves,
       subtotal_ves + tax_ves = total_ves AS cuadra_ves,
       exchange_rate, exchange_rate_date
  FROM orders WHERE id = <N>;

-- Los renglones y su desglose congelado
SELECT product_name, quantity, price, subtotal, base, iva,
       base + iva = subtotal AS cuadra_renglon
  FROM order_items WHERE order_id = <N>;

-- Referencias del ERP
SELECT order_number, status, order_key, purchase_order_key, date_completed
  FROM orders WHERE id = <N>;
```

## Hallazgos detectados al leer el código

| ID | Caso | Qué pasó | Severidad | Estado |
|---|---|---|---|---|
| H-01 | CP-11 | El pedido que recibe el ERP no tiene ningún campo de descuento. Cuando el cliente usa un cupón, las líneas llegan ya rebajadas (el descuento se reparte proporcionalmente) y OrbisNet no puede saber que hubo cupón ni cuánto fue. Confirmar si su facturación lo necesita. | Alta | Abierto |
| H-02 | CP-08 / CP-09 | El pedido que recibe el ERP viene sólo en dólares: no trae la tasa de cambio ni los montos en bolívares, aunque el pedido sí los tiene guardados. Si OrbisNet factura en bolívares con su propia tasa, va a facturar un monto distinto al que la tienda le mostró al cliente. | Alta | Abierto |
| H-03 | CP-05 / CP-20 | Asimetría del contrato: GET /api/v1/orders/:id acepta el id numérico o el UUID, pero PUT sólo acepta el id numérico (con UUID responde 400). Además el UUID no aparece en ningún campo de la respuesta, así que el ERP no puede descubrirlo por su cuenta. | Baja | Abierto |
| H-04 | CP-26 | El parámetro perPage no tiene tope: perPage=100000 devuelve todos los pedidos en on-hold en una sola consulta. Un ERP mal configurado puede degradar el servidor sin querer. | Media | Abierto |
| H-05 | CP-26 | page y perPage no validan mínimo. Con perPage=0 el límite queda en cero (puede devolver TODO y un lastPage infinito) y con page=0 o negativa el salto queda negativo, lo que Postgres rechaza y podría subir como 500. ⚠ Verificar en vivo y anotar el comportamiento real. | Media | Abierto |
| H-06 | CP-15 | Los permisos de las llaves no son jerárquicos: una llave de 'escritura' NO puede leer. La llave que use OrbisNet tiene que ser de 'lectura y escritura' o la mitad del flujo falla con 403. | Media | Abierto |
| H-07 | CP-04 | El guion anterior (docs/guion-pruebas-produccion.md, paso C5) dice que al anular se envían correos al cliente y al administrador. El código no envía ninguno: las anulaciones se atienden por WhatsApp. Hay que corregir el guion para no crear una expectativa falsa en la prueba. | Baja | Abierto |
| H-08 | CP-24 | La fecha date_completed se valida como ISO 8601 pero no en su contenido: se acepta '2026-08-01' (sin hora, se guarda como medianoche UTC = 8:00 pm del día anterior en Venezuela) y también fechas del futuro lejano. ⚠ Verificar cómo se muestran en el panel. | Baja | Abierto |
| H-09 | CP-14 | El guard acepta las credenciales también como parámetros de la URL (?consumer_key=…&consumer_secret=…), lo que deja la llave y el secreto escritos en los registros del servidor y en el historial de peticiones. Acordar con el integrador que use sólo la cabecera. | Media | Abierto |
| H-10 | CP-27 | GET /api/v1/orders (listado general) devuelve el pedido crudo — con cédula, dirección, correo, teléfono y datos del pago — a cualquier llave de solo lectura, y pagina en memoria después de traer TODOS los pedidos de la base. Ya estaba anotado en el guion anterior; sigue abierto. | Media | Abierto |
| H-11 | CP-09 | Las columnas de montos en bolívares topan en Bs 99.999.999,99 (unos USD 207.800 a la tasa actual, y el techo baja cada vez que sube la tasa). Un pedido por encima de eso falla al guardar y deja filas huérfanas (dirección, ficha de invitado, datos de pago) sin pedido que las use. | Baja | Abierto |
| H-12 | CP-01 | La cola de on-hold sólo devuelve pedidos que tengan al menos un renglón (usa un cruce obligatorio con los ítems). Un pedido sin renglones existiría en la base y el ERP nunca lo vería. Hoy no debería ocurrir, pero no hay nada que lo impida. | Baja | Abierto |
| H-13 | CP-12 | La igualdad 'suma de líneas + suma de IVA = total' sólo se cumple mientras el envío sea 0, que es el valor fijo de hoy. Cuando se implemente el cobro de envío, el contrato del ERP va a necesitar un campo de envío aparte (shipping_total, como en WooCommerce) o el ERP facturará de menos. | Media | Abierto |
| H-14 | CP-21 | Confirmar (status=pending) un pedido que ya fue facturado, con la misma O/C, responde 200 y deja el pedido en 'completed'. Si OrbisNet interpreta ese 200 como 'quedó en pendiente', queda desincronizado. Acordar con el integrador que lea el status de la respuesta, no sólo el código HTTP. | Media | Abierto |
| H-15 | CP-02 / CP-03 | order_key no tiene restricción de unicidad: dos pedidos distintos pueden quedar con la misma orden de compra o el mismo número de factura sin que el sistema avise. | Baja | Abierto |

## Al terminar

1. Anular todos los pedidos de prueba que no se hayan anulado ya, para devolver el inventario.
2. Revisar que la existencia de cada producto usado volvió al valor inicial anotado.
3. Volver a activar cualquier llave de API que se haya desactivado en CP-14.
4. Pasar los hallazgos abiertos a la minuta de la reunión, con responsable y fecha.

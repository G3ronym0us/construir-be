# Guion de pruebas para producción

Secuencia para repetir con el cliente en el entorno real. Cada paso dice qué
hacer, qué debe pasar y cómo comprobarlo. Los pasos marcados **⚠️** dejan rastro
en producción (pedidos, correos, inventario) — leer «Antes de empezar».

Se derivó de las pruebas de preproducción del 2026-07-31; los hallazgos que las
originaron están en `pruebas-preproduccion.md`.

---

## Antes de empezar

**1. Los correos salen de verdad.** El SMTP es un relay real, no un simulador.
Cada pedido de prueba envía confirmación al correo que se escriba en el checkout,
y aviso al de `ADMIN_NOTIFICATION_EMAIL`. Usar direcciones propias.

**2. Comprobar que el aviso al admin está configurado:**

```bash
# En el servidor
grep ADMIN_NOTIFICATION_EMAIL .env
```

Si no está, los avisos de pedido nuevo y de pedido anulado **no se envían** y no
queda error: sólo un `warn` en el log. Nadie se entera de que entran pedidos.

**3. Órdenes viejas que el ERP no debe tomar.** Antes de encender el *polling*:

```sql
SELECT count(*) FROM orders WHERE status = 'on-hold' AND tax = 0;
```

Si da > 0 son pedidos anteriores al modelo de IVA inclusivo: su `subtotal` es la
base sin IVA y el ERP les facturaría un impuesto que el cliente nunca pagó.
Resolverlos antes.

**4. Los pedidos de prueba descuentan inventario real.** Anotar cuáles son para
anularlos al terminar y que el stock vuelva.

---

## Flujo A — Compra de invitado

### A1 · Agregar al carrito ⚠️

Sin sesión, entrar a una categoría **con muchos productos** y agregar uno que
**no** esté entre los más recientes del catálogo.

> Importante: el bug que esto detecta sólo aparece con productos fuera de los
> primeros 100 por fecha de creación. Con un producto recién creado pasa igual
> aunque esté roto.

**Debe pasar:** el contador queda en 1 y el producto sigue ahí al abrir el
carrito.

**Si falla:** el contador muestra 1 un instante y vuelve el botón de agregar.

### A2 · Ver el carrito

Con **tres o más artículos**, sin scrollear.

**Debe pasar:** el total se ve en la barra inferior, junto al botón de pagar. El
desglose (Subtotal / IVA / Total) queda más abajo, y eso está bien.

### A3 · Cédula y autocompletado

En el checkout, escribir una cédula **con** pedidos previos y salir del campo.

**Debe pasar:** se autocompletan nombre, apellido, teléfono y correo, con el
aviso «Datos autocompletados · N pedidos anteriores».

Después, volver atrás y escribir una cédula **sin** registro.

**Debe pasar:** los campos quedan **vacíos**.

**Si falla:** quedan los datos de la persona anterior — y si se confirma así, el
pedido sale a nombre de otro y contamina el registro de esa cédula.

Extra: volver a la primera cédula. Los datos deben reaparecer sin una segunda
consulta (el endpoint admite 5 por minuto).

### A4 · Enter desde el teclado (móvil)

Escribir la cédula y pulsar Enter sin bajar el teclado.

**Debe pasar:** avanza al paso de datos y autocompleta.

### A5 · Desglose

**Debe pasar:** base + IVA = total, con el IVA al 16% de la base (o la alícuota
que corresponda al producto).

### A6 · Confirmar ⚠️

Anotar el número de orden.

**Debe pasar:** pantalla de confirmación, correo al cliente y correo al admin.

### A7 · Seguimiento

Abrir `/seguimiento/<número de orden>`.

**Debe pasar:** número, estado, fechas, montos y renglones.

**No debe aparecer:** cédula, teléfono, correo, dirección, referencia del pago,
enlace al comprobante, notas internas ni la referencia del ERP.

---

## Flujo B — Compra creando cuenta

Igual que el Flujo A, marcando «Crear cuenta para seguir mis pedidos».

### B1 · Con un correo que NO tenga cuenta ⚠️

**Debe pasar:** el pedido se crea y queda asociado al usuario nuevo.

### B2 · Con un correo que YA tenga cuenta ⚠️

> `users.email` es único y el alta de la cuenta ocurre **después** de guardar el
> pedido y descontar inventario, sin comprobar si el correo ya existe.

**Ocurre hoy:** respuesta 500. El pedido **queda creado** y el inventario
descontado, pero el cliente ve un error y no recibe la confirmación.

Si el cliente va a probar este caso, avisarle de antemano y anotar el pedido
huérfano para anularlo.

---

## Flujo C — Ciclo del ERP

El ERP consulta cada 10 minutos `GET /api/v1/orders/on-hold`. Una orden vive:
`on-hold` → `pending` (el ERP la toma) → `completed` o `cancelled`.

Autenticación: `Authorization: Bearer <consumer_key>:<consumer_secret>`.

### C1 · El ERP ve el pedido

```bash
curl -s -H "Authorization: Bearer $CK:$CS" \
  "$API/api/v1/orders/on-hold?page=1&perPage=10"
```

**Comprobar en el pedido de prueba:**

| Campo | Debe ser |
|---|---|
| `line_items[].total` | **sin** IVA |
| `line_items[].total_tax` | el impuesto aparte |
| `Σ total + Σ total_tax` | igual al `total` de la orden |
| `tax_rate` | la alícuota nominal (16, no 16,04) |
| `tax_class` | `""` |
| `date_created` | hora local de la tienda, no UTC |
| `billing.phone` | con el teléfono, también en pedidos de retiro |
| `billing.address_2` | la identificación |
| `billing.*` vacíos | `""`, nunca `null` |

### C2 · El ERP registra su O/C

```bash
curl -X PUT -H "Authorization: Bearer $CK:$CS" -H 'Content-Type: application/json' \
  -d '{"status":"pending","order_key":"OC-XXXX"}' "$API/api/v1/orders/<id>"
```

**Debe pasar:** 200, el pedido pasa a `pending` y sale de la cola de `on-hold`.

### C3 · Reintento del acuse

Repetir C2 **idéntico**.

**Debe pasar:** 200. Es el caso real: el ERP escribe bien, pierde la respuesta
por timeout y reintenta.

Con una O/C **distinta**: 400. Eso no es un reintento.

### C4 · Facturar ⚠️

```bash
curl -X PUT -H "Authorization: Bearer $CK:$CS" -H 'Content-Type: application/json' \
  -d '{"status":"completed","order_key":"OC-XXXX / FAC-YYYY","date_completed":"..."}' \
  "$API/api/v1/orders/<id>"
```

**Debe pasar:** 200, estado `completed`, correo de pago confirmado al cliente.
El reintento idéntico también da 200; con otra factura, 400.

**Comprobar:** `purchase_order_key` conserva la O/C mientras `order_key` pasa a
la concatenación. Y el inventario **no** cambia: facturar no repone stock.

### C5 · Anular ⚠️

```bash
curl -X PUT -H "Authorization: Bearer $CK:$CS" -H 'Content-Type: application/json' \
  -d '{"status":"canceled","date_completed":"..."}' "$API/api/v1/orders/<id>"
```

Se aceptan las dos grafías, `canceled` y `cancelled`.

**Debe pasar:** 200, estado `cancelled`, correos al cliente y al admin.

**Lo crítico:** el inventario vuelve **una sola vez**. Anotar el stock antes,
repetir la llamada dos o tres veces y confirmar que no sigue subiendo.

Facturar un pedido ya anulado: 400.

### C6 · Consulta por id

```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $CK:$CS" \
  "$API/api/v1/orders/<id>"
```

**Debe pasar:** 200 con la forma WooCommerce (con `line_items`). Un id
inexistente o un valor que no sea id ni uuid: **404**, nunca 500.

---

## Comprobaciones en base de datos

Con `<N>` = id del pedido de prueba.

```sql
-- Los montos cuadran
SELECT subtotal, tax, total, subtotal + tax = total AS cuadra,
       subtotal_ves, tax_ves, total_ves,
       subtotal_ves + tax_ves = total_ves AS cuadra_ves
  FROM orders WHERE id = <N>;

-- Los renglones suman el total, y el desglose quedó congelado
SELECT product_name, quantity, price, subtotal, base, iva,
       base + iva = subtotal AS cuadra_renglon
  FROM order_items WHERE order_id = <N>;

SELECT sum(subtotal) AS suma_renglones, sum(base) AS suma_base, sum(iva) AS suma_iva
  FROM order_items WHERE order_id = <N>;
```

`base` e `iva` **no deben estar en NULL** en pedidos nuevos: son el desglose
congelado al crear la orden. En NULL significa que se creó antes de la migración.

```sql
-- El cliente quedó bien, sin datos de otra persona
SELECT gc.identification_type || '-' || gc.identification_number AS cedula,
       gc.first_name, gc.last_name, gc.email, gc.phone, gc.orders_count
  FROM orders o JOIN guest_customers gc ON gc.id = o.guest_customer_id
 WHERE o.id = <N>;

-- Inventario descontado
SELECT p.sku, p.name, oi.quantity AS pedido, p.inventory AS stock
  FROM order_items oi JOIN products p ON p.id = oi.product_id
 WHERE oi.order_id = <N>;

-- Referencias del ERP
SELECT order_number, status, order_key, purchase_order_key, date_completed
  FROM orders WHERE id = <N>;
```

---

## Al terminar

1. Anular los pedidos de prueba que no se hayan anulado ya, para devolver el
   inventario.
2. Borrar las cuentas creadas en el Flujo B, si no se quieren conservar.
3. Revisar que no quedaran pedidos huérfanos del caso B2.

---

## Puntos sin resolver, a tener presentes

- **`POST /orders/:uuid/receipt`** es una escritura **sin autenticar** que
  devuelve la orden completa: cédula, domicilio, datos del pago y el enlace al
  comprobante. Quien tenga el uuid puede además pisar el comprobante.
- **`GET /api/v1/orders`** (el listado v1) devuelve esos mismos datos a
  cualquier API key de sólo lectura, y pagina en memoria sobre todos los pedidos.
- **El alta de cuenta no comprueba si el correo ya existe** (caso B2).
- **La invariante `Σ total + Σ total_tax = total`** sólo se cumple mientras el
  envío sea 0. Cuando se implemente el costo de envío, el contrato del ERP va a
  necesitar `shipping_total` aparte, como hace WooCommerce.

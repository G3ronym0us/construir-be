# Entregables — Construir

Documentos preparados la noche del **1 de agosto de 2026**.

---

## Los documentos

| # | Documento | Para quién | Para qué |
|---|-----------|-----------|----------|
| 1 | [Alcance y costos](01-alcance-y-costos.md) | El cliente | Qué se construyó, cuánto vale y qué se cobra |
| 2 | [Pruebas aplicadas](02-pruebas-aplicadas.md) | Usted y el cliente | Las 168 pruebas que se hicieron y los 10 hallazgos |
| 3 | [Casos de prueba ERP](03-casos-prueba-erp.xlsx) | **La reunión de mañana** | 27 casos y 135 pasos para marcar con el cliente |
| 3b | [Casos de prueba ERP (texto)](03-casos-prueba-erp.md) | Referencia | Lo mismo del Excel, en formato de lectura |
| 4 | [Manual del cliente](04-manual-cliente-movil.md) | Clientes finales | Cómo comprar desde el celular, con capturas |
| 5 | [Manual del administrador](05-manual-admin-escritorio.md) | Personal de la tienda | Cómo usar el panel, con capturas |

Las capturas están en `manual/cliente/` (21 imágenes) y `manual/admin/` (17 imágenes).

---

## Antes de la reunión de mañana

Tres cosas, en orden de importancia:

### 1. 🔴 Revisar la tasa de cambio en producción

La tasa vigente en producción es del **30 de julio** y hoy es **1 de agosto**. Las tareas
programadas que la actualizan (diaria a la 1:00 AM y cada 20 minutos en horario hábil) no
parecen estar corriendo.

**Por qué importa mañana:** los montos que se le muestren al cliente se calculan con esa
tasa. Si está vieja, los precios en bolívares están por debajo del valor real.

Qué revisar: los registros del servidor y que `BCV_RATES_API_KEY` esté configurada en producción.

### 2. 🟠 Cargar los datos de la tienda en el servidor

En producción, la consulta de datos de la tienda devuelve todo vacío. Verificado: un cliente
que elija "Retiro en tienda" **no ve la dirección, ni el teléfono, ni el horario**.

Es solo configuración. En el servidor, agregar al `.env` las variables `STORE_ADDRESS`,
`STORE_CITY`, `STORE_PHONE`, `STORE_HOURS`, `STORE_EMAIL`, `STORE_MAP_URL`,
`STORE_WHATSAPP_URL` y `STORE_RIF` — los valores correctos ya están en el `.env` local — y
reiniciar el contenedor. Cinco minutos.

**No lo apliqué** porque toca producción en vivo y usted pidió solo reportar.

### 3. 🟠 Conversar con OrbisNet el punto de la reconfirmación

Si el ERP reconfirma un pedido ya facturado usando **la misma** orden de compra, el sistema
responde **200 (todo bien)** y el pedido se queda en "completado". Si el ERP solo lee el
código de respuesta, va a creer que lo movió a "pendiente" y los dos sistemas quedan
desincronizados. Está en el Excel como hallazgo H-14 y en el documento 2 como Hallazgo 4.

---

## Lo que necesito de usted

**El costo de Brevo.** No tengo acceso a esa cuenta. En el documento 1, sección 6, hay un
recuadro para llenar: el plan, el monto mensual y desde qué mes se paga. Con eso el cuadro
de costos queda completo.

---

## Cambios que hice en el código

Trabajé en la rama **`docs/entrega-cliente-agosto`**, partiendo de
`feat/tasa-publicada-servicio-central`. Son dos arreglos, ambos necesarios para poder probar:

| Archivo | Qué pasaba | Qué hice |
|---------|-----------|----------|
| `src/orders/orders.module.ts` | **El backend no arrancaba.** El módulo de pedidos declaraba `EmailService` como propio, y al hacerlo el `EmailPayloadBuilder` nuevo no quedaba disponible. | Importar `EmailModule` y quitar la declaración duplicada. |
| `src/main.ts` | Los archivos estáticos apuntaban a `dist/public`, que no existe. | Resolver la ruta desde la raíz del proyecto. |

El primero es **bloqueante**: sin ese arreglo esa rama no levanta. El segundo no afecta
producción, porque allá las imágenes se sirven desde S3.

**No toqué** ningún otro código de la aplicación, ni el servidor de producción, ni la base
de datos de producción.

---

## Dos avisos honestos

**1. Se enviaron 7 correos reales a su Hotmail.** Al empezar, el entorno local estaba
configurado con las credenciales reales de Brevo. Antes de darme cuenta, salieron 7 avisos
de "Pedido nuevo" a `diohandres1703@hotmail.com`, de pedidos de prueba. En cuanto lo
detecté redirigí todo el correo a un buzón local y no volvió a salir ninguno. Esos avisos
en su bandeja **no corresponden a pedidos reales**.

**2. Detuve otros proyectos locales**, como me pidió: los servidores de desarrollo de
`tasas-project` (puerto 3000) y de `construir-fe` (puerto 3001) están apagados. Para volver
a levantarlos, arránquelos normalmente.

También dejé un worktree de pruebas en `../construir-fe-test` (una copia del frontend para
no tocar la suya). Para borrarlo:

```bash
cd ../construir-fe && git worktree remove --force ../construir-fe-test
```

---

## Resumen de los hallazgos

| # | Hallazgo | Gravedad | Estado |
|---|----------|----------|--------|
| 1 | Sobreventa por producto repetido en el carrito (una sola petición) | 🔴 Alta | Pendiente |
| 1b | Sobreventa por compras simultáneas (reproducido: 4 → −12) | 🔴 Alta | Pendiente |
| 2 | Error 500 ante paginación o identificadores mal escritos | 🟠 Media | Pendiente |
| 3 | Producto inexistente devuelve renglón fantasma en la cotización | 🟠 Media-baja | Pendiente |
| 4 | Reconfirmar pedido facturado responde "todo bien" | 🟠 Media | Conversar con OrbisNet |
| 5 | Los correos muestran el correo del cliente en vez de su nombre | 🟡 Baja | Pendiente |
| 6 | Las 10 plantillas de correo dicen "Caracas" | 🟡 Baja | Pendiente |
| 7 | Faltan los datos de la tienda en producción | 🟠 Media | Pendiente (configuración) |
| 8 | La tasa de cambio tiene 2 días de atraso | 🟠 Media | **Revisar antes de la reunión** |
| 9 | El backend no arrancaba en la rama actual | 🔴 Bloqueante | ✅ Corregido |
| 10 | Las imágenes locales no se servían | 🟡 Baja | ✅ Corregido |

**Lo que quedó demostrado que funciona bien:** los 42 controles de permisos, las cuentas de
IVA y bolívares al céntimo, la compra completa de punta a punta, el ciclo entero con el ERP,
las 17 pantallas del panel sin un solo error, y el rechazo de los intentos de inyección de
SQL y de código en pantalla.

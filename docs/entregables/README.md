# Entregables — Construir

Documentos preparados la noche del **1 de agosto de 2026**.

---

## Los documentos

| # | Documento | Para quién | Para qué |
|---|-----------|-----------|----------|
| 1 | [Alcance y costos](01-alcance-y-costos.md) | **Uso interno** | Qué se construyó, cuánto vale y qué se cobra |
| 1b | [**Alcance del proyecto (PDF)**](Construir-Alcance-del-proyecto.pdf) | **El cliente** | Solo qué se construyó. Sin costos, sin hallazgos, sin pendientes. Listo para entregar |
| 2 | [Pruebas aplicadas](02-pruebas-aplicadas.md) | **Uso interno** | Las 168 pruebas y los 10 hallazgos con causa raíz y ubicación |
| 2b | [**Informe de pruebas (PDF)**](Construir-Informe-de-pruebas.pdf) | **El cliente** | Las mismas 168 pruebas, sin detalle interno de los hallazgos. Listo para entregar |
| 3 | [Casos de prueba ERP](03-casos-prueba-erp.xlsx) | **La reunión de mañana** | 27 casos y 135 pasos para marcar con el cliente |
| 3b | [Casos de prueba ERP (texto)](03-casos-prueba-erp.md) | Referencia | Lo mismo del Excel, en formato de lectura |
| 4 | [**Manual del cliente (PDF)**](Construir-Manual-del-cliente.pdf) | **Clientes finales** | Cómo comprar desde el celular, con 20 capturas. 16 páginas |
| 5 | [**Manual del administrador (PDF)**](Construir-Manual-del-administrador.pdf) | **Personal de la tienda** | Cómo usar el panel, con 17 capturas. 18 páginas |
| 4b · 5b | [Manual del cliente](04-manual-cliente-movil.md) · [del administrador](05-manual-admin-escritorio.md) | Fuente | Los mismos manuales en Markdown, para editarlos |

Las capturas están en `manual/cliente/` (21 imágenes) y `manual/admin/` (17 imágenes).

**Los cuatro PDF listos para entregar:** alcance del proyecto, informe de pruebas, manual del
cliente y manual del administrador. Los `.md` son la fuente: si edita uno, hay que volver a
generar su PDF.

---

## Antes de la reunión de mañana

Tres cosas, en orden de importancia:

### 1. ✅ La tasa de cambio — RESUELTO el 1 de agosto

**Diagnóstico corregido.** Los crons **sí estaban corriendo**, cada 20 minutos y puntuales.
Lo que pasaba es que **fallaban todas las veces**: faltaban tres variables en el `.env` del
servidor (`BCV_RATES_URL`, `BCV_RATES_API_KEY`, `BCV_RATES_TIMEOUT_MS`), que el
`.env.example` documenta como requeridas pero nunca se cargaron.

El cambio entró con el commit `211f30f` (29-jul) y se desplegó con el **PR #1** el 30-jul a
las 05:27 UTC. La última sincronización buena fue ese mismo día a las 05:00 UTC, 27 minutos
antes. Desde entonces, ~2 días y más de 100 intentos fallidos.

**Aplicado:** se rotó la llave `construir` del servicio de tasas (el texto plano anterior se
había perdido: solo se guarda el hash), se cargaron las tres variables, se recreó el
contenedor y se corrió la sincronización más el recálculo de precios.

**Verificado:** la tasa pasó de 745,64 a **748,78** (fecha efectiva 03-ago) y la cotización
en producción cuadra — tasa declarada 748,78, tasa implícita 748,79, y base + IVA = total.

⚠️ **La llave nueva hay que guardarla** en el gestor de contraseñas. Está en el `.env` del
servidor y se entregó por separado. Si se pierde, hay que rotarla otra vez.

⚠️ **Observación aparte:** hoy (sábado 1-ago) el sistema quedó usando la tasa con fecha
efectiva del **lunes 3-ago** (748,78) en vez de la del viernes 31-jul (746,63) — una
diferencia de 0,29%. El proyecto `bcv-rates-service` ya tenía anotada esta discrepancia como
*«el bug de +1 día hábil de construir-be»* en `scripts/parallel-compare/compare.spec.ts`.
Es preexistente y conviene decidir cuál de las dos fechas debe regir.

### 2. ✅ Los datos de la tienda — RESUELTO el 1 de agosto

En producción, la consulta de datos de la tienda devuelve todo vacío. Verificado: un cliente
que elija "Retiro en tienda" **no ve la dirección, ni el teléfono, ni el horario**.

Es solo configuración. En el servidor, agregar al `.env` las variables `STORE_ADDRESS`,
`STORE_CITY`, `STORE_PHONE`, `STORE_HOURS`, `STORE_EMAIL`, `STORE_MAP_URL`,
`STORE_WHATSAPP_URL` y `STORE_RIF` — los valores correctos ya están en el `.env` local — y
reiniciar el contenedor. Cinco minutos.

**Aplicado y verificado.** En el sitio real ya se ven la dirección, el teléfono, el horario y
el enlace al mapa. Se cargaron además `ADMIN_NOTIFICATION_EMAIL` —sin él no salía ningún aviso
de pedido nuevo—, `STORE_RIF` y `STORE_WHATSAPP_URL`.

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
| 1 | Sobreventa por producto repetido en el carrito (una sola petición) | 🔴 Alta | ✅ Corregido y desplegado |
| 1b | Sobreventa por compras simultáneas (reproducido: 4 → −12) | 🔴 Alta | ✅ Corregido y desplegado |
| 2 | Error 500 ante paginación o identificadores mal escritos | 🟠 Media | Pendiente |
| 3 | Producto inexistente devuelve renglón fantasma en la cotización | 🟠 Media-baja | Pendiente |
| 4 | Reconfirmar pedido facturado responde "todo bien" | 🟠 Media | Conversar con OrbisNet |
| 5 | Los correos muestran el correo del cliente en vez de su nombre | 🟡 Baja | Pendiente |
| 6 | Las 10 plantillas de correo dicen "Caracas" | 🟡 Baja | Pendiente |
| 7 | Faltaban los datos de la tienda en producción | 🟠 Media | ✅ Corregido y verificado |
| 8 | La tasa de cambio tenía 2 días de atraso (faltaban 3 variables en el `.env`) | 🟠 Media | ✅ Corregido y verificado |
| 8b | El sistema toma la tasa con fecha efectiva del siguiente día hábil | 🟡 Baja | Preexistente, ya anotado en `bcv-rates-service` |
| 9 | El backend no arrancaba en la rama actual | 🔴 Bloqueante | ✅ Corregido |
| 10 | Las imágenes locales no se servían | 🟡 Baja | ✅ Corregido |
| 11 | No se avisaba al administrador de los pedidos nuevos | 🟠 Media | ✅ Corregido y verificado |
| 12 | La referencia del domicilio no viaja al ERP | 🟡 Baja | Conversar con OrbisNet |

**Lo que quedó demostrado que funciona bien:** los 42 controles de permisos, las cuentas de
IVA y bolívares al céntimo, la compra completa de punta a punta, el ciclo entero con el ERP,
las 17 pantallas del panel sin un solo error, y el rechazo de los intentos de inyección de
SQL y de código en pantalla.

# Rediseño de las plantillas de correo

**Fecha:** 2026-07-31
**Estado:** aprobado, pendiente de plan de implementación
**Origen:** handoff `Pantallas storefront construir-fe.zip`, carpeta `email-templates/`

## Problema

Las plantillas actuales maquetan con `display:flex` y `gap`. Outlook usa el motor
de Word, que los ignora: hoy los renglones de `order-confirmation` y
`admin-new-order` se apilan mal ahí. El handoff las rehace en `<table
role="presentation">` de 600 px con espaciado por padding, y de paso resuelve el
modo oscuro con fondos claros y bordes explícitos más `color-scheme: light only`
— eliminando los ~25 `!important` por plantilla que hay hoy.

Además, el diseño exige **bolívar protagonista y dólar de referencia**, con la
tasa a la vista. El servicio hoy sólo pasa montos en USD.

## Qué trae el handoff

| Archivo | Estado | Método |
|---|---|---|
| `partials/header.hbs`, `partials/footer.hbs` | nuevos | — |
| `order-confirmation.hbs` | rediseñada | `sendOrderConfirmation` |
| `payment-confirmed.hbs` | rediseñada | `sendPaymentConfirmed` |
| `order-shipped.hbs` | rediseñada | `sendOrderShipped` |
| `email-verification.hbs` | rediseñada | `sendEmailVerification` |
| `password-reset.hbs` | rediseñada | `sendPasswordReset` |
| `invitation.hbs` | rediseñada | `sendInvitationEmail` |
| `admin-new-order.hbs` | rediseñada | `sendAdminNewOrder` |
| `payment-rejected.hbs` | nueva | `sendPaymentRejected` (no existe) |
| `welcome.hbs` | nueva | `sendWelcome` (no existe) |
| `order-ready-for-pickup.hbs` | nueva | sin flujo |

## Decisiones tomadas

### Las cancelaciones dejan de notificarse por correo

El handoff descarta `order-canceled.hbs` porque «las cancelaciones las atiende un
vendedor por WhatsApp», pero el código las sigue enviando desde cuatro puntos de
`orders.service.ts` — dos de ellos en `cancelPendingOrder`, la anulación que el
ERP dispara por API. Borrar las plantillas sin tocar el código haría que
`loadTemplate` reventara **después** de devolver el inventario y guardar la
orden: el ERP vería un 500 sobre una anulación que sí ocurrió.

Se eliminan los métodos `sendOrderCanceled`, `sendAdminOrderCancelled` y
`sendOrderDelivered`, sus plantillas y sus llamadas. `sendOrderDelivered` no
tenía consumidores.

### Dos plantillas entran sin disparador

**`order-ready-for-pickup`** no tiene estado que la dispare: el ciclo es
`on-hold` → `pending` → `completed`/`cancelled`, y lo mueve el ERP. Ninguno de
esos momentos significa que el pedido esté armado en el mostrador.

**`order-shipped`** está en la misma situación por otro motivo: el método
`sendOrderShipped` existe pero **no lo llama nadie**. Se rediseña la plantilla y
se le quita `trackingNumber`, pero sigue sin haber un punto del flujo que la
envíe.

Ambas se incorporan y quedan esperando su flujo. Se documentan como pendientes
de producto: hoy no hay ni un estado «liste para retirar» ni uno «enviado», y
crearlos excede este trabajo.

### La fecha de la tasa se persiste

Las plantillas muestran «BCV 481,22 · 19 abr». Esa fecha no está en la orden, y
la fecha del pedido **no sirve como sustituto**: la tasa publicada puede ser de
días antes — en la base local la más reciente es del 2026-04-19 mientras los
pedidos son de julio. Mostrar la fecha del pedido sería mentir.

Columna nueva `orders.exchange_rate_date`, escrita desde `pricing.rateDate`, que
`OrderPricingService` ya calcula y hoy se descarta — el mismo caso que
`base`/`iva`. Migración aditiva y nullable, **sin backfill**: la tasa vigente
cuando se creó una orden vieja no se puede reconstruir con certeza.

Las órdenes anteriores muestran sólo la tasa, sin fecha.

### `reportedAmountVes` se vuelve condicional

`payment-rejected.hbs` imprime `Bs. {{reportedAmountVes}}` sin condicional, pero
ese dato no existe: al rechazar un pago el admin sólo puede dejar `adminNotes`,
no el monto que el cliente dijo haber pagado. Recogerlo implicaría un campo
nuevo en el DTO y en el panel, fuera del alcance de este trabajo.

Se envuelve ese renglón en `{{#if reportedAmountVes}}`. Es la única desviación
respecto del handoff recibido, y queda anotada para quien lo diseñó.

### `sendOrderShipped` pierde `trackingNumber`

El handoff es explícito: sólo hay retiro en tienda o delivery, no existe número
de guía ni empresa de encomienda, y el delivery se coordina por WhatsApp. El
parámetro se elimina de la firma del método.

## Diseño

### Componente 1 — `src/email/money.util.ts`

Formatea los montos duales. Única pieza que conoce `Intl.NumberFormat`.

```ts
export interface DualAmount {
  usd: string;   // "229.68"
  ves: string;   // "110.526,10"  — sin el prefijo "Bs.", lo pone la plantilla
}

export function dual(usd: number | string | null, ves: number | string | null): DualAmount | null;
export function ves(amount: number | string | null): string | null;
```

Devuelve `null` cuando no hay monto, para que la plantilla oculte el bloque en
vez de imprimir `Bs. null`. El bolívar se formatea en `es-VE`: punto para
millares y coma decimal.

### Componente 2 — `src/email/payload.builder.ts`

Arma el bloque que comparten las diez plantillas. Recibe `ConfigService`; no
sabe de plantillas ni de órdenes.

```ts
export interface CommonPayload {
  logoUrl: string;
  whatsappUrl: string | null;
  storeRif: string | null;
  store: { name; address; city; hours; phone; email; mapUrl };
}

buildCommonPayload(): CommonPayload
trackingUrl(orderNumber: string): string   // {frontendUrl}/seguimiento/{orderNumber}
```

Los campos sin configurar salen `null` y la plantilla oculta su bloque: es
preferible a un enlace de WhatsApp roto o un `Bs. ` suelto.

### Componente 3 — `EmailService` como orquestador

En el constructor registra los parciales de `templates/partials/` y el helper
`concat`, que es el único que las plantillas usan.

Cada método de envío queda en: cargar plantilla, componer `buildCommonPayload()`
con lo propio, enviar. El `subject` sale del payload de cada plantilla y deja de
ser un parámetro de `sendEmail`.

### Configuración nueva

| Variable | Uso |
|---|---|
| `STORE_WHATSAPP_URL` | El enlace de contacto de ocho plantillas |
| `STORE_RIF` | Sólo en `invitation.hbs` |

Ambas con valor vacío por defecto, junto a los `STORE_*` que ya existen.

### Disparadores nuevos

Los dos van sobre puntos que ya existen; no hacen falta estados ni endpoints.

**`sendPaymentRejected`** en `OrdersService.updateOrderStatus`, simétrico al de
verificado. Hoy la transición a `PaymentStatus.REJECTED` no notifica nada.

**`sendWelcome`** después de `UsersService.verifyEmail`, que es el momento en
que la cuenta queda utilizable.

## Manejo de errores

`loadTemplate` hace `readFileSync` sin guarda: si falta un archivo, revienta. Y
varios envíos ocurren **después** de escrituras irreversibles — `cancelPendingOrder`
devuelve inventario y guarda la orden antes de notificar, `completeOrder` lo
mismo.

Los envíos pasan a registrarse y seguir, no a propagar: un fallo de correo no
puede tumbar una operación que ya se aplicó. Es el criterio que `UsersService`
ya usa con la verificación (`.catch(err => console.error(...))`).

| Situación | Comportamiento |
|---|---|
| Falta una plantilla | Se registra el error; la operación de negocio termina bien |
| Falta `STORE_WHATSAPP_URL` o `STORE_RIF` | La plantilla oculta ese bloque |
| Orden sin `exchange_rate_date` | Se muestra la tasa sin fecha |
| Orden sin montos en Bs. | Se muestra sólo el USD |

## Pruebas

**`money.util`** — casos de borde: nulos, cero, y montos grandes que cambian de
separador de millares. Es la pieza con más riesgo de error silencioso: un
formato equivocado se ve raro pero no falla.

**`payload.builder`** — que oculte los bloques cuando falta configuración, en
vez de emitir enlaces rotos.

**Una por plantilla: compila en modo estricto con el payload real.** Es el
fallo típico de un cambio de plantillas —un nombre de variable que no coincide
con lo que pasa el servicio deja un hueco en el correo— y hoy no hay nada que lo
detecte.

La comprobación tiene que ser `handlebars.compile(fuente, { strict: true })`:
por defecto Handlebars renderiza la variable ausente como **cadena vacía**, así
que buscar `{{` en el HTML resultante no encontraría nada. En modo estricto
lanza `"noExiste" not defined`, que es exactamente lo que se quiere detectar.

Cada prueba compila su plantilla con el payload que arma su método y afirma que
no lanza. Los campos legítimamente opcionales —`whatsappUrl`, `storeRif`,
`exchangeRateDate`, `reportedAmountVes`— van dentro de `{{#if}}`, que en modo
estricto no falla ante un valor ausente.

**La anulación del ERP sigue funcionando** sin las plantillas eliminadas:
devuelve inventario, responde 200, y no intenta enviar nada.

## Riesgo residual

- **Dos plantillas quedan sin usar** (`order-ready-for-pickup` y
  `order-shipped`). Un archivo que nada renderiza se desactualiza en silencio
  respecto de los demás. Se acepta a propósito para no perder el diseño, y queda
  anotado. Sus pruebas de compilación estricta sí corren, así que al menos no se
  romperán sin que nadie se entere.
- **`reportedAmountVes` no se recoge en ninguna parte**, así que ese renglón de
  `payment-rejected` nunca se va a mostrar hasta que exista el campo.
- **Los correos salen por un relay real.** Las pruebas manuales de estas
  plantillas mandan correo de verdad: conviene un capturador local (Mailpit) o
  usar direcciones propias.

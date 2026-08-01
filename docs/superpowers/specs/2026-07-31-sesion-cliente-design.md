# Pantallas de la sesión del cliente

**Fecha:** 2026-07-31
**Estado:** aprobado, pendiente de plan de implementación
**Origen:** handoff `Constru-ir Sesion Cliente.dc.html` (proyecto de diseño
`6392220b-bf0d-483b-ae62-2fb1500dc179`), el mismo del que salieron las
plantillas de correo.
**Repos:** casi todo en `construir-fe`; un endpoint en `construir-be`.

## Problema

El handoff cubre las nueve pantallas posteriores al checkout: confirmación,
detalle, seguimiento, crear cuenta, verificación, recuperar y cambiar
contraseña, mi cuenta, y los estados vacío/no encontrado/error.

La identidad ya aterrizó: las ocho páginas afectadas usan los tokens de
`globals.css` y ninguna conserva clases legacy. Lo que falta no es color sino
**estructura y contenido** — y, en el caso de la confirmación, un dato que la
página hoy no recibe.

## Qué hay hoy

| Pantalla | Ruta | Estado |
|---|---|---|
| 11 Confirmación | `/checkout/confirmacion` | Sólo conoce `?method=`. Sin pedido, sin totales |
| 12 Detalle | `components/orders/OrderDetail.tsx` | Falta la línea de tiempo y la tarjeta de pago con comprobante |
| 13 Seguimiento | `/seguimiento/[orderNumber]` | Rehecha hoy; falta la barra de avance y el aviso de privacidad |
| 14 Crear cuenta | `/register` | **Ya implementada al diseño** (AuthShell, campos, error de confirmación) |
| 15 Revisa tu correo | estado `success` de `/register` | Estilo viejo; sin botón de reenvío |
| 16 Recuperar | `/forgot-password` | Falta el estado «enviado» y la tarjeta TIP |
| 17 Nueva contraseña | `/reset-password` | Falta medidor de fuerza y datos del enlace |
| 18 Mi cuenta | `/mi-cuenta` | Es una página de contacto de la tienda; el diseño pide pestañas y datos del cliente |
| 19 Estados | transversal | Vacío, no encontrado y error de carga |

## Decisiones tomadas

### Las direcciones guardadas salen del alcance

La pantalla 18 trae una pestaña «Direcciones» con predeterminada, agregar,
editar y eliminar. No existe nada de eso: la única entidad de dirección
(`shipping-address`) cuelga de una orden y muere con ella. Construirla implica
entidad, migración, CRUD autenticado, y decisiones de producto que este handoff
no responde — si la dirección guardada precarga el checkout, y qué pasa con los
pedidos de invitado, que son la mayoría.

Es un subsistema independiente: se brainstormea aparte, con su propio ciclo.
«Mi cuenta» queda con **Pedidos** y **Datos**.

### La barra de seguimiento se mapea a los estados que existen

El diseño pinta cuatro pasos: Recibido → Pago ok → **En camino** → **Entregado**.
Los dos últimos no son estados del sistema. El ciclo real es
`on-hold` → `pending` → `completed`/`cancelled`, y lo mueve el ERP con un
contrato ya cerrado con el integrador.

Es el mismo hueco que dejó `order-shipped.hbs` sin disparador en el trabajo de
correos, y se resuelve igual: no se inventa el estado. La barra pasa a

| Paso | Estado real |
|---|---|
| Recibido | `on-hold` — el pedido entró |
| Confirmado | `pending` — el ERP acusó recibo |
| En preparación | `pending` con el pago verificado |
| Entregado | `completed` |

`cancelled` es un ramal aparte, no un paso: la barra se tiñe de rojo y muestra
el estado final en vez de seguir avanzando.

**El pago rechazado es el segundo ramal.** `PaymentStatus` tiene tres valores
—`pending`, `verified`, `rejected`— y el diseño sólo dibuja los dos primeros
(«Pago por verificar» ámbar, «Pago ok»). Un pago rechazado detiene el pedido y
ya dispara correo desde el trabajo anterior (`sendPaymentRejected`): dejarlo
pintado como «por verificar» le diría al cliente que espere algo que no va a
pasar. Se pinta en rojo, con el texto que lo manda a WhatsApp, que es donde se
resuelve.

Se omite también la ventana de entrega del diseño («el vendedor acordó contigo
el jueves 30 de julio, entre 8 a.m. y 1 p.m.»). Ese dato no existe en ninguna
tabla y no hay dónde capturarlo. En su lugar queda el bloque de coordinación
por WhatsApp, que sí refleja cómo ocurre hoy.

### El enlace de reset expone su metadata; la promesa de cerrar sesión se cae

La pantalla 17 muestra «jose@correo.com · Enlace válido · vence en 47 min».
`passwordResetExpiresAt` existe en `User` pero no se expone: hoy el front sólo
tiene el token opaco y no sabe ni de quién es ni cuánto le queda.

Se agrega `GET /auth/reset-password/:token`, que valida y devuelve el correo y
la expiración. Hay precedente exacto: `GET /users/invitation/:token`.

**El correo se devuelve enmascarado** (`jo•••@correo.com`). Un endpoint público
que convierte un token en una dirección de correo legible es un
oráculo de enumeración si el token se filtra; el diseño sólo necesita que el
usuario reconozca su cuenta, y para eso basta el enmascarado.

En cambio se elimina la frase «al guardar cerramos la sesión en los demás
dispositivos». Los JWT son stateless y no hay lista de revocación: la sesión de
otro dispositivo sigue viva hasta que expire su token. Prometer una revocación
que no ocurre no es un problema de copy sino de seguridad — el usuario que
cambia la contraseña porque cree que alguien entró se quedaría tranquilo sin
motivo. Implementarla de verdad (columna `tokensValidFrom` comparada en
`JwtStrategy`) es trabajo de auth con riesgo propio, y queda anotado como
pendiente.

### La confirmación pasa a conocer su pedido

Hoy `checkout` redirige a `/checkout/confirmacion?method=pago_movil` y la
página no sabe más. El diseño necesita número de pedido, cantidad de artículos,
método de entrega y el total en bolívares con su referencia en dólares.

La redirección pasa a llevar el número de pedido, y la página lo resuelve
contra `GET /orders/track/:orderNumber`, que ya es público y ya devuelve
exactamente eso. No hace falta endpoint nuevo ni pasar el pedido por
`sessionStorage`: el mismo dato alimenta la pantalla 13.

Mientras carga se muestra el esqueleto; si falla, la pantalla degrada al
mensaje de éxito sin cifras — el pedido **sí** se creó, y una confirmación que
falla no puede sugerir lo contrario.

### Desaparece la promesa del número de rastreo

Las dos variantes de «¿Qué sigue?» de la confirmación actual terminan en
«Recibirás un número de rastreo para seguir tu envío». No existe: no hay
transportista, ni guía, ni campo donde guardarla. El diseño la reemplaza por
tres pasos —verificamos el pago, preparamos el pedido, coordinamos la entrega—
y esos son los que quedan.

### La rama de Zelle se conserva

La página actual bifurca todo su texto según `method === 'zelle'`, porque en
Zelle el cliente aún no pagó: un vendedor le pasa los datos después. El diseño
no contempla ese caso. Se conserva la bifurcación sólo en el primer paso de
«¿Qué sigue?» y en el chip de estado; el resto de la pantalla es común.

## Diseño

### Componentes nuevos en `construir-fe`

Todos bajo `src/components/session/`, que hoy no existe.

**`OrderProgress.tsx`** — la barra de cuatro pasos de la pantalla 13 y la línea
de tiempo vertical de la 12. Una sola pieza que traduce
`(status, paymentStatus)` a la posición y al ramal de cancelado; las dos
pantallas la consumen con una prop `variant: 'bar' | 'timeline'`.

Es el único lugar que conoce el mapeo estado→paso. Ese mapeo es la regla de
negocio de esta entrega y no puede quedar duplicada en dos pantallas: es
exactamente el error que se pagó tres veces con la resolución del carrito.

**`PasswordStrength.tsx`** — las cuatro barras y la lista de requisitos de la
pantalla 17. Recibe la contraseña, devuelve el nivel y qué requisitos se
cumplen. Puro front, sin red.

**`EmptyState.tsx`** — las tres tarjetas de la pantalla 19 (vacío, no
encontrado, error), con icono, título, texto y acciones.

**`ResendLink.tsx`** — el botón «Reenviar enlace · disponible en 0:42» de la
pantalla 15, con su cuenta regresiva. Consume `POST /users/resend-verification`,
que ya existe.

### Backend: un endpoint

```
GET /auth/reset-password/:token
200 → { email: "jo•••@correo.com", expiresAt: "2026-07-31T18:47:00Z" }
404 → token inexistente, ya usado o vencido
```

Sin autenticación, como el de invitación. Devuelve 404 —no 410— para no
distinguir «no existe» de «venció»: la diferencia sólo le sirve a quien esté
probando tokens.

### Formato de los montos

El bolívar es el monto protagonista y el dólar la referencia, igual que en los
correos. El front ya formatea en `es-VE` (punto para millares, coma decimal);
se reutiliza lo que hay, no se agrega una utilidad paralela.

La tasa se muestra como «tasa BCV 118,32». La fecha de la tasa
(`exchangeRateDate`, que se persiste desde el trabajo de correos) se muestra
cuando existe y se omite en los pedidos anteriores a esa migración.

## Manejo de errores

| Situación | Comportamiento |
|---|---|
| La confirmación no puede resolver el pedido | Mensaje de éxito sin cifras, con el número de pedido de la URL |
| Seguimiento con número inexistente | Tarjeta «No encontramos ese pedido» (pantalla 19) con reintentar e ingresar |
| Fallo de red en `/mi-cuenta/ordenes` | Tarjeta «No pudimos cargar tus pedidos» con reintentar y WhatsApp |
| Cliente sin pedidos | Estado vacío «Aún no tienes pedidos» con «Ver productos» |
| Token de reset vencido | La pantalla 17 no pinta la tarjeta del enlace y muestra el aviso rojo que ya existe |
| `STORE_WHATSAPP_URL` sin configurar | El botón de WhatsApp no se pinta, igual que en las plantillas |

## Pruebas

**`OrderProgress`** es la pieza con lógica real y la que más pruebas necesita:
un caso por estado (`on-hold`, `pending` sin pago verificado, `pending` con
pago verificado, `completed`, `cancelled`, y `pending` con el pago
**rechazado**), afirmando qué paso queda activo. Los dos ramales —cancelado y
pago rechazado— son los que más fácil se rompen porque no son pasos más de la
secuencia, y una prueba que sólo recorra el camino feliz no los toca.

**`PasswordStrength`** — que los requisitos se enciendan por separado. El
riesgo es que el nivel y la lista se calculen dos veces con reglas distintas.

**El endpoint de reset** — token válido, token vencido, token ya usado, token
inventado. Y que el correo salga enmascarado: es la afirmación que protege la
decisión de seguridad, y sin ella un refactor la revierte en silencio.

**La confirmación** — que pinte las cifras cuando el pedido resuelve, y que
degrade sin romperse cuando no. No que «no lance»: que el número de pedido
siga visible en la variante degradada.

Las pruebas de las pantallas van con Testing Library sobre el componente, no
capturas de pantalla: el handoff cambia y las capturas envejecen mal.

## Riesgo residual

- **La revocación de sesiones queda sin implementar.** Se quita la frase, pero
  el hueco real —cambiar la contraseña no expulsa a nadie— sigue ahí. Es la
  misma familia que el `JWT_SECRET` ausente que ya está escalado.
- **Las direcciones guardadas quedan pendientes**, y con ellas el checkout
  sigue pidiendo la dirección completa en cada compra a los clientes
  registrados.
- **Dos pasos de la barra no se alcanzan nunca** en la práctica mientras el ERP
  no distinga preparación de entrega: un pedido salta de `pending` a
  `completed`. La barra es honesta pero poco granular.
- **La pantalla 18 pierde una de sus tres pestañas**, así que el resultado no
  es idéntico al handoff. Hay que devolvérselo a quien lo diseñó, junto con las
  siete plantillas de correo que ya se desviaron.

# Construir — Alcance del proyecto

**Qué se construyó**

**Fecha:** agosto de 2026<br>
**Período de trabajo:** noviembre de 2025 – agosto de 2026 (9 meses)

---

## 1. Resumen

Se construyó, desde cero, la tienda en línea de Construir y el sistema que la sostiene por
detrás. No es una plantilla ni un sitio armado con módulos comprados: es un sistema hecho a
la medida del negocio, con el catálogo real de la ferretería, el manejo de dólares y
bolívares como se maneja en Venezuela, y una conexión directa con OrbisNet, el ERP (el
sistema administrativo donde la empresa lleva su inventario y su facturación).

### Lo que hay hoy funcionando

- Una tienda pública en **constru-ir.com** con 1.269 productos y 102 categorías.
- Un panel de administración completo para manejar productos, pedidos, clientes, cupones,
  banners y usuarios.
- Un sistema de precios que convierte solo de dólares a bolívares con la tasa oficial del
  BCV, y que calcula el IVA producto por producto.
- Compra sin registrarse o con cuenta, con tres formas de pago venezolanas (Pago Móvil,
  Zelle y transferencia) y carga del comprobante por parte del cliente.
- Correos automáticos al cliente y al administrador en cada paso del pedido.
- Una API (la puerta por la que otro sistema se conecta a este) para que OrbisNet lea los
  pedidos y devuelva su estado.
- Publicación automática de cambios: se aprueba un cambio y sale al aire solo.

### El proyecto en números

| Concepto | Cantidad |
|---|---|
| Líneas de código escritas | ~48.800 |
| Cambios registrados | 251 |
| Pantallas del sitio | 45 |
| Pruebas automatizadas | 78 archivos |
| Tiempo de trabajo | 9 meses |

---

## 2. Qué se construyó, explicado por partes

### 2.1 El catálogo

Se pasaron 1.269 productos, 102 categorías y 1.826 imágenes desde el WordPress viejo al
sistema nuevo. Eso no fue copiar y pegar: hubo que reordenar los datos, arreglar las
direcciones de las imágenes que apuntaban al servidor anterior y descargarlas una por una.

Cada producto tiene su código SKU (el código interno con que la empresa identifica cada
artículo), varias imágenes, inventario, categoría y tipo de IVA. Las categorías se organizan
en árbol (categoría y subcategoría) y cada una guarda además un "código externo", que es la
llave con la que se amarra a la categoría equivalente en OrbisNet.

Desde el panel se pueden publicar o despublicar productos en lote, marcarlos como
destacados, subir y ordenar imágenes, y ver un listado de artículos con inventario bajo.

### 2.2 Dólares, bolívares y el IVA

Este es el corazón del sistema y es lo que más trabajo llevó.

Los productos se guardan en dólares y **sin IVA**. Todo lo demás el sistema lo calcula: el
IVA según la alícuota que le toque a cada producto (16% normal, 24% de lujo, o exento), el
precio final en dólares y el precio en bolívares.

La tasa del BCV entra sola. El sistema consulta la tasa oficial publicada a través de un
servicio propio que la lee directamente del sitio del Banco Central. Consulta dos veces:

- Todos los días a la 1:00 de la madrugada, hora de Caracas.
- Cada 20 minutos entre las 12:00 del mediodía y las 11:00 de la noche, de lunes a viernes,
  que es la ventana en que el BCV publica la tasa del día siguiente.

Cuando detecta una tasa nueva, recalcula los precios en bolívares de los 1.269 productos. Si
la tasa no cambió, no toca nada, para no cargar el servidor sin necesidad. Y si el BCV no
responde, el sistema sigue trabajando con la última tasa guardada en lugar de quedarse sin
precios.

Sobre el IVA hay una decisión importante: el precio que el cliente ve en el catálogo es el
precio final, con IVA incluido. En el checkout ese mismo número se descompone hacia atrás
para mostrar base más IVA. El total nunca cambia entre lo que el cliente vio en la vitrina y
lo que paga; solo se explica. El IVA se extrae línea por línea, con la alícuota propia de
cada producto, para no cobrarle IVA a los productos exentos cuando van en el mismo carrito
con productos gravados.

Los descuentos por cupón se reparten proporcionalmente entre las líneas del pedido, con
topes para que ninguna línea quede en negativo, y el redondeo está hecho de forma que la
suma de los renglones siempre dé exactamente el total. Suena a detalle menor; es la
diferencia entre una factura que cuadra y una que no.

También hay una protección contra el caso incómodo: si el cliente se demora en el checkout y
la tasa cambia mientras tanto, el sistema no cobra con la tasa vieja ni cobra en silencio
con la nueva. Detiene la operación, avisa y muestra el monto actualizado.

### 2.3 Carrito, compra y pago

El cliente puede comprar de dos maneras: creando una cuenta, o como invitado sin
registrarse. En el modo invitado, si ya compró antes, con solo escribir su cédula el
formulario se le llena solo con los datos de la vez anterior.

Formas de pago habilitadas: **Pago Móvil, Zelle y transferencia bancaria**. Cada una pide los
datos que le corresponden (banco, teléfono, cédula, número de referencia, nombre del emisor)
y el cliente puede subir la foto del comprobante, que queda guardada junto al pedido para
que el administrador la revise y marque el pago como verificado o rechazado.

El pedido pasa por cuatro estados: en espera (recién creado), pendiente (recibido por el
ERP), completado (facturado) y anulado. El cliente puede consultar su pedido en cualquier
momento con el número de orden, sin necesidad de tener cuenta.

### 2.4 El panel de administración

Catorce pantallas para manejar el negocio sin tocar código:

- **Productos:** crear, editar, subir imágenes, publicar en lote, ver inventario bajo.
- **Categorías** y su jerarquía.
- **Pedidos:** listado con filtros, detalle, cambio de estado, exportación a Excel.
- **Clientes** registrados y clientes invitados.
- **Cupones** de descuento.
- **Banners** de la página de inicio.
- **Usuarios** del sistema e invitaciones para dar de alta a personal nuevo.
- **Llaves de API** y su historial de uso.
- **Bitácora de auditoría.**
- **Tablero** con analíticas de ventas y páginas más visitadas.
- Una sección de **ayuda**.

### 2.5 Correos automáticos

Diez plantillas de correo diseñadas y armadas, que se envían solas cuando toca:

| Plantilla | Cuándo se envía |
|---|---|
| Confirmación de pedido | Al cliente, apenas compra |
| Aviso de pedido nuevo | Al administrador, apenas entra un pedido |
| Pago confirmado | Cuando se verifica el comprobante |
| Pago rechazado | Cuando el comprobante no cuadra |
| Pedido enviado | Al despachar |
| Listo para retirar en tienda | Cuando aplica retiro |
| Verificación de correo | Al registrarse |
| Recuperación de contraseña | Al pedirla |
| Invitación de usuario | Al invitar a un empleado al panel |
| Bienvenida | Al completar el registro |

Los correos salen por un servicio especializado de envío. Se usa ese servicio y no el correo
común porque los correos automáticos enviados desde un servidor propio suelen caer en spam.

### 2.6 La conexión con OrbisNet (el ERP)

Esta es la parte que más valor le da al sistema y la que casi nadie incluye en una tienda
armada con plantillas.

Se construyó una API pública versión 1, documentada, con su propio sistema de llaves de
acceso. Cada llave tiene permisos: solo lectura, solo escritura, o ambos. Con eso, OrbisNet
puede:

- Consultar el catálogo de productos y categorías.
- Actualizar el precio y el inventario de un producto por su SKU.
- Leer los pedidos nuevos que están en espera.
- Confirmar que recibió un pedido.
- Devolver el estado de un pedido cuando lo factura o lo anula.

La documentación de esa API es automática, o sea que el técnico del lado de OrbisNet entra a
una dirección web y ve todas las operaciones disponibles con ejemplos, sin que nadie le
tenga que explicar nada por teléfono.

Un detalle que costó trabajo y que vale la pena mencionar: el formato en que OrbisNet espera
los montos no es el mismo en que los guarda Construir. OrbisNet quiere el renglón sin IVA y
el IVA aparte; Construir maneja el precio con IVA incluido. Se escribió un traductor entre
los dos formatos, con sus pruebas automatizadas, para que los montos que le llegan al ERP
sean exactamente los correctos.

### 2.7 Avisos automáticos a sistemas externos

Además de que OrbisNet pregunte, el sistema puede avisar. Hay nueve tipos de avisos
configurables: producto creado, actualizado o eliminado; pedido creado, actualizado o con
cambio de estado; cliente creado, actualizado o eliminado. Quien quiera enterarse registra
una dirección web y el sistema le toca la puerta cuando pasa algo.

### 2.8 Seguridad y control

- Inicio de sesión con token (una credencial temporal que expira sola).
- **Roles:** administrador general, administrador de pedidos y cliente. Cada uno ve y hace
  solo lo que le toca.
- Alta de personal **por invitación**, no por registro abierto.
- Verificación de correo y recuperación de contraseña.
- Límite de solicitudes por minuto en las rutas sensibles, para frenar a quien intente
  adivinar contraseñas o barrer datos.
- **Bitácora de auditoría:** queda registrado quién creó, modificó o eliminó qué cosa en el
  panel, y cuándo.
- **Registro de llamadas a la API:** cada consulta que hace OrbisNet queda anotada, con su
  llave, su resultado y su tiempo de respuesta. Si mañana hay una discusión sobre "el
  sistema no me mandó el pedido", hay cómo revisarlo.

### 2.9 Publicación automática

Cada cambio aprobado se publica solo en el servidor: se descarga el código nuevo, se arma el
paquete, se aplican los cambios pendientes de base de datos y se levanta la versión nueva.
Sin que nadie tenga que entrar al servidor a mano. Eso reduce el riesgo de que un despliegue
rompa algo por un paso olvidado.

### 2.10 Pruebas automatizadas

78 archivos de pruebas que se ejecutan solos y verifican que el sistema haga lo que debe: 42
en el sistema de fondo, 29 en el sitio web y 7 pruebas de recorrido completo (que simulan a
un usuario real comprando, iniciando sesión, creando un producto).

Esto no se ve, pero es lo que evita que arreglar una cosa rompa otra tres meses después.

---

## 3. El detalle técnico en números

| Métrica | Sistema de fondo | Sitio web | Total |
|---|---|---|---|
| Líneas de código de producción | 17.918 | 30.888 | 48.806 |
| Líneas de pruebas | 6.662 | (incluidas arriba) | — |
| Archivos de pruebas | 42 | 29 + 7 de recorrido | 78 |
| Cambios registrados | 147 | 104 | 251 |
| Pantallas | — | 45 | 45 |
| Componentes reutilizables | — | 101 | 101 |
| Módulos funcionales | 23 | — | 23 |
| Rutas de API | 139 | — | 139 |
| Tablas de base de datos | 21 | — | 21 |
| Migraciones de base de datos | 23 | — | 23 |
| Plantillas de correo | 10 + 2 parciales | — | 12 |
| Tipos de aviso automático | 9 | — | 9 |
| Idiomas soportados | — | 2 (español, inglés) | 2 |

**Contenido cargado:** 1.269 productos, 102 categorías, 1.826 imágenes.

**Tecnologías empleadas:** NestJS con PostgreSQL del lado del servidor; Next.js 16 con React
y Tailwind del lado del sitio; Docker para el empaquetado; GitHub Actions para la
publicación automática; Amazon S3 para las imágenes nuevas.

---

## 4. Lo que distingue a este sistema

Vale la pena señalar tres cosas que no vienen incluidas en una tienda armada con plantillas
y que aquí se construyeron a la medida:

**El manejo de dólares, bolívares e IVA.** La mayoría de las plataformas de comercio
electrónico manejan una sola moneda y un solo impuesto. Acá el precio se guarda en dólares
sin IVA, y el sistema deriva solo el impuesto que corresponde a cada producto y la
conversión a bolívares con la tasa oficial del día, recalculando el catálogo completo cada
vez que el BCV publica.

**La conexión con el ERP.** El sistema no es una isla: los pedidos entran a OrbisNet y
vuelven con su estado, de forma automática y con registro de cada llamada. Eso elimina la
carga manual de pedidos y el error humano que trae.

**La forma de pago venezolana.** Pago Móvil, Zelle y transferencia, con los datos exactos en
pantalla, botón de copiar y carga del comprobante por parte del cliente. Es el flujo real
del país, no una pasarela de tarjeta adaptada a la fuerza.

---

*Construir — Materiales de construcción · Ciudad Bolívar, Estado Bolívar, Venezuela*

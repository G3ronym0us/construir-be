# Pruebas aplicadas al sistema Construir

**Fecha:** 1 de agosto de 2026
**Entorno de pruebas:** copia local del sistema (backend, frontend y base de datos con el catálogo real de 1.269 productos)
**Verificaciones adicionales:** consultas de solo lectura contra el sitio en producción

---

## Cómo leer este documento

Este documento cuenta qué se probó, cómo se probó y qué se encontró. No hace falta saber
programación para entenderlo.

Cada prueba tiene una marca:

| Marca | Qué significa |
|-------|---------------|
| ✅ | Pasó. El sistema se comportó como debía. |
| ⚠️ | Funciona, pero hay algo que conviene revisar o mejorar. |
| ❌ | Falló. Hay un defecto que debe corregirse. |
| 🔍 | No se pudo probar en este entorno. Se explica por qué. |

**Un aviso importante sobre el enfoque.** No se probó solamente que el sistema funcione
cuando todo va bien. Buena parte del trabajo fue **intentar romperlo a propósito**: mandar
datos inválidos, pedir más mercancía de la que hay, intentar entrar sin permiso, intentar
ver los datos de otros clientes, y simular ataques comunes. Esa es la parte que de verdad
dice si un sistema está listo para producción.

---

## Resumen en una página

Se ejecutaron **168 verificaciones** repartidas en 12 áreas.

| Resultado | Cantidad |
|-----------|---------:|
| ✅ Pasaron | 154 |
| ⚠️ Pasan con observación | 6 |
| ❌ Fallaron (defectos encontrados) | 8 |

### Lo que quedó demostrado que funciona bien

- **La seguridad de accesos es sólida.** 42 intentos de entrar sin permiso o de hacer cosas
  de administrador con una cuenta de cliente: **los 42 fueron bloqueados correctamente**.
- **Las cuentas matemáticas son exactas.** Los precios, el IVA y la conversión a bolívares
  cuadran al céntimo, tanto en el carrito como en el pedido final y en producción.
- **Una compra completa funciona de punta a punta**, incluyendo la carga del comprobante de pago.
- **El ciclo completo con el ERP funciona**, desde que el pedido entra en cola hasta que se factura.
- **Los intentos de ataque conocidos fueron rechazados**: inyección de SQL, inyección de código
  en pantalla (XSS), y tokens de sesión falsificados.

### Lo que hay que arreglar antes de seguir creciendo

| # | Problema | Gravedad |
|---|----------|----------|
| 1 | Se puede vender más mercancía de la que hay en inventario (dos formas distintas) | 🔴 Alta |
| 2 | El servidor devuelve "error interno" en vez de un mensaje claro ante datos mal escritos | 🟠 Media |
| 3 | Los datos de la tienda no salen en producción: falta configuración en el servidor | 🟠 Media |
| 4 | Los correos muestran el correo electrónico del cliente en vez de su nombre | 🟡 Baja |
| 5 | Los correos dicen que la tienda está en Caracas, cuando está en Ciudad Bolívar | 🟡 Baja |

---

# Parte 1 — Inicio de sesión

Se probaron 12 formas distintas de entrar, casi todas equivocadas a propósito.

| # | Qué se probó | Resultado esperado | ✔ |
|---|--------------|--------------------|---|
| 1.1 | Entrar sin escribir nada | Que lo rechace | ✅ |
| 1.2 | Escribir un correo mal formado ("noesuncorreo") | Que avise que el correo es inválido | ✅ |
| 1.3 | Entrar con un usuario que no existe | Que lo rechace | ✅ |
| 1.4 | Entrar con la contraseña equivocada | Que lo rechace | ✅ |
| 1.5 | **Intento de ataque:** inyección de SQL en el campo de correo | Que lo rechace sin tocar la base de datos | ✅ |
| 1.6 | Contraseña vacía | Que lo rechace | ✅ |
| 1.7 | Enviar basura en vez de datos ordenados | Que lo rechace | ✅ |
| 1.8 | **Intento de ataque:** enviar campos extra para hacerse administrador | Que ignore o rechace los campos | ✅ |
| 1.9 | Ver el perfil sin haber iniciado sesión | Que lo bloquee | ✅ |
| 1.10 | Ver el perfil con una credencial inventada | Que lo bloquee | ✅ |
| 1.11 | Ver el perfil con una credencial sin el formato correcto | Que lo bloquee | ✅ |
| 1.12 | **Intento de ataque:** credencial firmada con el método "ninguno" (truco conocido para saltarse la seguridad) | Que lo bloquee | ✅ |

**Resultado: 12 de 12.** El sistema de inicio de sesión resistió todos los intentos.

Un detalle que vale la pena destacar del punto 1.8: al enviar campos de más (por ejemplo,
intentando declararse administrador), el sistema no los ignora en silencio — responde
diciendo exactamente qué campos sobran. Eso es lo correcto y es mejor de lo que se esperaba.

---

# Parte 2 — Registro de clientes

| # | Qué se probó | Resultado esperado | ✔ |
|---|--------------|--------------------|---|
| 2.1 | Registrarse sin llenar nada | Que lo rechace | ✅ |
| 2.2 | Registrarse con un correo mal escrito | Que avise | ✅ |
| 2.3 | Registrarse con una contraseña de 3 caracteres | Que exija una más larga | ✅ |
| 2.4 | Registro correcto | Que cree la cuenta | ✅ |
| 2.5 | Registrarse dos veces con el mismo correo | Que avise que ya existe | ✅ |
| 2.6 | **Intento de ataque:** registrarse pidiendo el rol de administrador | Que lo rechace | ✅ |
| 2.7 | **Intento de ataque:** poner código malicioso en el nombre | Que lo guarde como texto, sin ejecutarlo | ✅ |

**Resultado: 7 de 7.**

Sobre el punto 2.7: se creó una cuenta cuyo nombre era, literalmente,
`<script>alert('xss')</script>`. Después se revisó el panel de administración y los correos.
En ambos lugares el texto **se muestra como texto plano**, no se ejecuta. Esa es exactamente
la protección que debe haber.

## Verificación de correo electrónico

| # | Qué se probó | Resultado esperado | ✔ |
|---|--------------|--------------------|---|
| 2.8 | Iniciar sesión sin haber verificado el correo | Que no lo deje entrar y explique por qué | ✅ |
| 2.9 | Verificar el correo con el enlace recibido | Que active la cuenta | ✅ |
| 2.10 | Iniciar sesión después de verificar | Que ahora sí lo deje entrar | ✅ |
| 2.11 | Usar dos veces el mismo enlace de verificación | Que rechace el segundo uso | ✅ |
| 2.12 | Verificar sin enlace | Que lo rechace | ✅ |
| 2.13 | Verificar con un enlace inventado | Que lo rechace | ✅ |

**Resultado: 6 de 6.** El flujo completo de alta de cuenta está bien cerrado.

⚠️ **Observación menor.** Cuando alguien se registra, la respuesta del sistema incluye
campos internos que el cliente no necesita ver (identificadores internos, el espacio
reservado para el token de recuperación de contraseña). Hoy no filtra información sensible
—esos campos vienen vacíos— pero es buena práctica no exponerlos. No es urgente.

---

# Parte 3 — Recuperación de contraseña

| # | Qué se probó | Resultado esperado | ✔ |
|---|--------------|--------------------|---|
| 3.1 | Pedir recuperación sin escribir el correo | Que lo rechace | ✅ |
| 3.2 | Pedir recuperación con un correo mal escrito | Que lo rechace | ✅ |
| 3.3 | Abrir un enlace de recuperación inventado | Que avise que no vale | ✅ |
| 3.4 | Cambiar la contraseña con un enlace inválido | Que lo rechace | ✅ |
| 3.5 | Cambiar la contraseña sin escribir la nueva | Que lo rechace | ✅ |
| 3.6 | Pantalla de recuperación en el celular | Que cargue y responda | ✅ |

**Resultado: 6 de 6.**

---

# Parte 4 — Permisos: quién puede hacer qué

Esta es la parte más importante en materia de seguridad. Se probó que un cliente común no
pueda hacer cosas de administrador, y que nadie sin sesión pueda hacer nada.

## 4.1 Sin haber iniciado sesión (10 pruebas)

Se intentó, sin credenciales: ver la lista de usuarios, crear un producto, borrar un
producto, ver las estadísticas de ventas, exportar la lista de clientes, ver el registro de
auditoría, ver las llaves del ERP, crear una categoría, crear un cupón e invitar usuarios.

**Resultado: 10 de 10 bloqueados.** ✅

## 4.2 Con una cuenta de cliente normal (12 pruebas)

Se creó una cuenta de cliente real, se verificó el correo, se inició sesión y con esa sesión
se intentó hacer cosas de administrador.

| Lo que intentó el cliente | ¿Se lo permitió? | ✔ |
|---------------------------|------------------|---|
| Ver la lista de usuarios del panel | No | ✅ |
| Crear un producto | No | ✅ |
| Ver el registro de auditoría | No | ✅ |
| Ver las llaves del ERP | No | ✅ |
| Exportar la lista de clientes | No | ✅ |
| Borrar un producto | No | ✅ |
| Crear un cupón de descuento | No | ✅ |
| Invitar a otros usuarios | No | ✅ |
| Ver las estadísticas de ventas | No | ✅ |
| Ver **su propio** perfil | Sí (correcto) | ✅ |
| Ver **su propio** carrito | Sí (correcto) | ✅ |
| Ver **sus propios** pedidos | Sí (correcto) | ✅ |

**Resultado: 12 de 12.** ✅

## 4.3 Que el administrador sí pueda trabajar (10 pruebas)

Se verificó que el administrador sí tenga acceso a las 10 áreas del panel.
**Resultado: 10 de 10.** ✅

## 4.4 Ver los pedidos de otra persona (3 pruebas)

| # | Qué se probó | Resultado | ✔ |
|---|--------------|-----------|---|
| 4.13 | Un cliente pide ver el pedido de otro cliente | Bloqueado | ✅ |
| 4.14 | Alguien sin sesión pide ver un pedido | Bloqueado | ✅ |
| 4.15 | Un cliente pide ver el perfil de otro usuario | Bloqueado | ✅ |

**Total de la Parte 4: 42 de 42 pruebas de permisos pasaron.** No se encontró ninguna
forma de ver o modificar lo que no corresponde.

---

# Parte 5 — Compra sin registrarse (invitado)

Se hizo una compra completa desde el celular, como la haría un cliente real, sin crear cuenta.

| Paso | Qué se verificó | ✔ |
|------|-----------------|---|
| 1 | El catálogo carga y muestra precios | ✅ |
| 2 | Agregar un producto al carrito | ✅ |
| 3 | El carrito **conserva** el producto | ✅ |
| 4 | El carrito muestra el desglose: subtotal, IVA y total | ✅ |
| 5 | El carrito muestra el precio en bolívares y en dólares con la tasa BCV | ✅ |
| 6 | Paso 1 del pago: identificación (cédula o RIF) | ✅ |
| 7 | Paso 2 del pago: nombre, apellido, teléfono y correo | ✅ |
| 8 | Paso 3a: elegir entre envío a domicilio o retiro en tienda | ✅ |
| 9 | Paso 3b: elegir método de pago (Zelle, Pago Móvil, Transferencia) | ✅ |
| 10 | El sistema muestra los datos exactos para pagar y el monto exacto | ✅ |
| 11 | Adjuntar el comprobante de pago | ✅ |
| 12 | El pedido se crea y aparece la pantalla de confirmación | ✅ |
| 13 | La confirmación explica los siguientes pasos al cliente | ✅ |
| 14 | El pedido **no se duplicó** al confirmar | ✅ |

**Resultado: 14 de 14.** La compra de invitado funciona de punta a punta.

Se verificó expresamente el punto 14 porque es un error frecuente en tiendas en línea:
al tocar "Realizar Pedido" se revisó la base de datos y **se creó un solo pedido**, no dos.

**Nota sobre el bug histórico del carrito.** En pruebas anteriores (documentadas en
`docs/pruebas-preproduccion.md`, hallazgo H-001) el carrito borraba solo el 91% de los
productos para clientes no registrados. **Se verificó específicamente y ya no ocurre.** ✅

---

# Parte 6 — Compra con sesión iniciada

| # | Qué se probó | Resultado | ✔ |
|---|--------------|-----------|---|
| 6.1 | Un cliente con sesión ve su carrito guardado en el servidor | Sí | ✅ |
| 6.2 | Un cliente con sesión ve su historial de pedidos | Sí | ✅ |
| 6.3 | Las páginas privadas ("Mi cuenta") exigen sesión | Sí | ✅ |

**Resultado: 3 de 3.** ✅

---

# Parte 7 — Intentos de romper el carrito y la cotización

Aquí es donde aparecieron los problemas más importantes. Se probaron 13 formas de enviar
datos inválidos o abusivos.

| # | Qué se probó | Resultado esperado | ✔ |
|---|--------------|--------------------|---|
| 7.1 | Cotizar sin productos | Rechazar | ✅ |
| 7.2 | Cotizar con la lista vacía | Rechazar | ✅ |
| 7.3 | Pedir **0 unidades** | Rechazar | ✅ |
| 7.4 | Pedir **−5 unidades** (cantidad negativa) | Rechazar | ✅ |
| 7.5 | Pedir **1,5 unidades** (cantidad decimal) | Rechazar | ✅ |
| 7.6 | Escribir "muchos" en vez de un número | Rechazar | ✅ |
| 7.7 | Pedir un producto que no existe | Rechazar | ⚠️ **Ver Hallazgo 3** |
| 7.8 | Enviar un identificador de producto mal formado | Rechazar con mensaje claro | ❌ **Hallazgo 2** |
| 7.9 | **Intento de ataque:** inyección de SQL en el identificador | Rechazar con mensaje claro | ❌ **Hallazgo 2** |
| 7.10 | Usar un cupón que no existe | Rechazar | ✅ |
| 7.11 | Pedir 9.999 unidades de algo que tiene 4 | Bloquear la compra | ✅ |
| 7.12 | Pedir 999.999.999.999 unidades | No reventar | ✅ |
| 7.13 | **Poner el mismo producto dos veces en el carrito** | Sumar y validar el total | ❌ **Hallazgo 1** |

---

# 🔴 Hallazgo 1 — Se puede vender más mercancía de la que hay

**Gravedad: alta.** Es el hallazgo más importante de todas las pruebas.

Hay **dos formas distintas** de lograr que el sistema venda inventario que no existe.

## Forma A: repetir el mismo producto en el carrito

**Cómo se reprodujo:**

1. Se tomó un producto con **4 unidades** en inventario.
2. Se armó un pedido con **dos renglones del mismo producto**: uno de 2 unidades y otro de 3.
   En total, 5 unidades.
3. El sistema **aceptó el pedido**.
4. El inventario quedó en **−1**.

**Por qué pasa.** El sistema revisa cada renglón por separado contra el inventario. Ve
"2 unidades ≤ 4, está bien" y luego "3 unidades ≤ 4, está bien". Nunca suma los dos
renglones para darse cuenta de que juntos piden 5.

**Dónde está:** `src/orders/orders.service.ts`, líneas 457 a 479.

**Cómo se arregla:** antes de validar, sumar las cantidades por producto y comparar el
total contra el inventario. Es un cambio contenido, de pocas líneas.

**Nota:** este caso es nuevo, no estaba documentado antes.

## Forma B: dos clientes comprando al mismo tiempo

**Cómo se reprodujo:**

1. Se tomó un producto con **4 unidades** en inventario.
2. Se lanzaron **4 pedidos simultáneos**, cada uno pidiendo las 4 unidades.
3. El sistema **aceptó los 4 pedidos** (16 unidades en total).
4. El inventario quedó en **−12**.

**Por qué pasa.** Cuando dos pedidos entran al mismo tiempo, ambos leen el inventario antes
de que el otro lo descuente. Los dos ven "hay 4" y los dos siguen adelante. El sistema no
bloquea el registro mientras hace la operación, y las escrituras del pedido no se agrupan
en una sola transacción.

**Este riesgo ya estaba anotado** en `docs/pricing-iva.md`, líneas 118 a 125, donde se
explica que `createOrder` hace unas ocho escrituras sin transacción y lee el inventario sin
bloqueo. Lo que aporta esta prueba es que **deja de ser un riesgo teórico**: está
reproducido con números concretos.

**Cómo se arregla:** envolver la creación del pedido en una transacción y bloquear la fila
del producto mientras se descuenta (`SELECT ... FOR UPDATE`), o hacer el descuento de forma
atómica y rechazar el pedido si el inventario queda negativo.

## Qué significa esto en la práctica

En el volumen de hoy es poco probable que ocurra por accidente. Pero:

- Se le puede vender a un cliente algo que no se le puede entregar.
- El ERP recibe una orden que no se puede despachar.
- El inventario del sistema deja de coincidir con el inventario real de la tienda.

**Recomendación: corregir la Forma A antes de la prueba con el cliente** (es el arreglo más
sencillo y el único que se puede provocar desde una sola petición). La Forma B se puede
planificar para la siguiente ronda de trabajo.

---

# 🟠 Hallazgo 2 — "Error interno" en vez de un mensaje claro

**Gravedad: media.** Confirmado también en producción.

Cuando se envían datos mal escritos en la dirección web, el sistema responde con
**"Error interno del servidor" (código 500)** en lugar de explicar qué está mal.

**Casos comprobados, tanto en local como en producción:**

| Lo que se pidió | Respuesta actual | Respuesta correcta |
|-----------------|------------------|--------------------|
| `productos?page=-1` (página negativa) | ❌ Error interno 500 | Aviso de dato inválido |
| `productos?page=0` (página cero) | ❌ Error interno 500 | Aviso de dato inválido |
| `productos?limit=-5` (cantidad negativa) | ❌ Error interno 500 | Aviso de dato inválido |
| `productos?page=abc` (texto en vez de número) | ❌ Error interno 500 | Aviso de dato inválido |
| Identificador de producto mal formado | ❌ Error interno 500 | Aviso de dato inválido |
| Intento de inyección de SQL en el identificador | ❌ Error interno 500 | Aviso de dato inválido |

**Importante:** esto **no es una falla de seguridad**. Se comprobó que la inyección de SQL
no funciona — la base de datos rechaza el dato y nadie logra leer ni modificar nada que no
deba. El problema es de presentación y de operación:

1. El cliente ve un error feo si algo va mal.
2. Un buscador (Google) que visite `?page=0` recibe un error de servidor, lo que perjudica
   el posicionamiento del sitio.
3. Los registros del servidor se llenan de errores falsos que esconden los errores de verdad.

**Cómo se arregla:** validar los parámetros de paginación (mínimo 1, máximo razonable) y
validar el formato de los identificadores antes de consultar la base de datos.

---

# 🟠 Hallazgo 3 — Producto inexistente en la cotización

**Gravedad: media-baja.**

Al cotizar un producto con un identificador que **no existe** (pero bien formado), el
sistema responde correctamente (código 200) pero incluye un renglón fantasma, con el nombre
y el precio vacíos, en vez de avisar que ese producto no existe.

En la práctica el daño es limitado porque al momento de **crear** el pedido sí se rechaza.
Pero conviene que la cotización avise desde el principio.

---

# Parte 8 — Seguimiento público de pedidos

Cualquiera con el número de pedido puede consultar su estado, sin iniciar sesión. Se probó
que eso no exponga datos personales.

| # | Qué se probó | Resultado | ✔ |
|---|--------------|-----------|---|
| 8.1 | Consultar un pedido con su número | Muestra el estado | ✅ |
| 8.2 | Consultar un número que no existe | Avisa que no existe | ✅ |
| 8.3 | **Intento de ataque:** inyección de SQL en el número | Rechazado | ✅ |
| 8.4 | **Revisar si expone datos personales** | **No expone ninguno** | ✅ |

El punto 8.4 se revisó campo por campo. El seguimiento devuelve: número de pedido, estado,
fechas, montos, tasa de cambio y los renglones. **No devuelve** cédula, teléfono, dirección
ni correo. Está bien resuelto.

---

# Parte 9 — Autocompletado por cédula

Existe una función que, al escribir la cédula en el checkout, completa automáticamente los
datos del cliente si ya compró antes. Esa consulta **es pública**: no exige iniciar sesión.

| # | Qué se probó | Resultado |
|---|--------------|-----------|
| 9.1 | Consultar una cédula sin iniciar sesión | Devuelve nombre, correo, teléfono y dirección | ⚠️ |
| 9.2 | Listar **todos** los clientes sin iniciar sesión | Bloqueado | ✅ |
| 9.3 | Comprobar el límite de consultas por minuto | 5 pasan, de la sexta en adelante se bloquea | ✅ |

## ⚠️ Esto es una decisión tomada a conciencia, no un descuido

Es importante dejarlo claro porque a primera vista parece un problema de seguridad.

El 30 de julio de 2026 esta función **sí exigía** un segundo dato (correo o teléfono)
además de la cédula. Ese requisito se quitó deliberadamente, y el motivo quedó escrito en
el historial del proyecto (revisión `54ce6fb`):

> *"La decisión de producto es que estorba más de lo que protege: el comprador no tiene por
> qué recordar con qué correo compró la vez pasada, y el autocompletado deja de servir
> justamente a quien más lo necesita."*

En ese mismo cambio se dejó anotado el riesgo con todas sus letras: las cédulas venezolanas
son secuenciales, así que quien recorra números en orden puede ir obteniendo los datos de
cada cliente que haya comprado. Como contrapeso, el límite de consultas se apretó de 10 a
5 por minuto.

**Lo que aporta esta prueba:** se verificó que la contención **funciona de verdad**. Se
hicieron 12 consultas seguidas: las primeras 5 respondieron y de la sexta en adelante el
sistema bloqueó. A 5 consultas por minuto, recorrer un rango de millones de cédulas desde
una misma conexión tomaría años.

**Recomendación:** no es necesario actuar hoy. Sí conviene revisar esta decisión cuando la
base de clientes crezca, y **nunca subir ese límite de 5 por minuto** sin entender que es
lo único que protege esa ruta.

---

# Parte 10 — Catálogo, cupones y otras consultas públicas

| # | Qué se probó | Resultado | ✔ |
|---|--------------|-----------|---|
| 10.1 | Listar productos | Funciona | ✅ |
| 10.2 | Buscar productos por texto | Funciona | ✅ |
| 10.3 | Pedir un producto que no existe | Avisa correctamente | ✅ |
| 10.4 | Listar categorías visibles | Funciona | ✅ |
| 10.5 | Listar bancos | Funciona | ✅ |
| 10.6 | Listar banners activos | Funciona | ✅ |
| 10.7 | Consultar la tasa de cambio actual | Funciona | ✅ |
| 10.8 | Pedir 999.999 productos de un golpe | No tumba el servidor | ✅ |
| 10.9 | Validar un cupón inexistente | Avisa que no vale | ✅ |
| 10.10 | Validar un cupón sin escribir el código | Rechaza | ✅ |
| 10.11 | Validar un cupón con un monto negativo | Rechaza | ✅ |

**Resultado: 11 de 11.** ✅

---

# Parte 11 — Integración con el ERP (OrbisNet)

Esta es la parte que se va a probar con el cliente. Se ejecutó completa.

## 11.1 Seguridad de las llaves de acceso (6 pruebas)

| # | Qué se probó | Resultado | ✔ |
|---|--------------|-----------|---|
| 11.1 | Consultar sin credenciales | Bloqueado | ✅ |
| 11.2 | Consultar con la llave pero sin el secreto | Bloqueado | ✅ |
| 11.3 | Consultar con el secreto equivocado | Bloqueado | ✅ |
| 11.4 | Consultar con credenciales inventadas | Bloqueado | ✅ |
| 11.5 | Consultar con credenciales correctas | Funciona | ✅ |
| 11.6 | Consultar poniendo las credenciales en la dirección web | Funciona | ⚠️ |

⚠️ **Sobre el punto 11.6.** El sistema acepta las credenciales escritas en la dirección web
(`?consumer_key=...&consumer_secret=...`), además de la forma correcta (en la cabecera de la
petición). Funciona, pero las credenciales escritas en la dirección quedan guardadas en los
registros del servidor y del proxy. **Recomendación:** pedirle al ERP que use siempre la
cabecera, y considerar desactivar la forma por dirección web más adelante.

## 11.2 Permisos de las llaves (4 pruebas)

Se crearon dos llaves: una de **solo lectura** y otra de **lectura y escritura**.

| # | Qué se probó | Resultado | ✔ |
|---|--------------|-----------|---|
| 11.7 | Llave de solo lectura intentando modificar un pedido | Bloqueado | ✅ |
| 11.8 | Llave de solo lectura intentando crear un producto | Bloqueado | ✅ |
| 11.9 | Llave de solo lectura intentando borrar un producto | Bloqueado | ✅ |
| 11.10 | Llave de lectura y escritura consultando | Funciona | ✅ |

## 11.3 Validaciones al modificar pedidos (7 pruebas)

| # | Qué se probó | Resultado | ✔ |
|---|--------------|-----------|---|
| 11.11 | Confirmar un pedido sin el número de orden de compra | Rechazado con mensaje claro | ✅ |
| 11.12 | Facturar sin el número de orden de compra | Rechazado | ✅ |
| 11.13 | Facturar sin la fecha | Rechazado | ✅ |
| 11.14 | Anular sin la fecha | Rechazado | ✅ |
| 11.15 | Modificar un pedido que no existe | Avisa que no existe | ✅ |
| 11.16 | Usar un identificador que no es un número | Rechazado | ✅ |
| 11.17 | Enviar un estado inventado | Rechazado | ✅ |

## 11.4 El ciclo completo, de punta a punta

Se creó un pedido real y se le hizo seguir todo el recorrido:

| Paso | Qué pasó | ✔ |
|------|----------|---|
| 1 | Se creó el pedido desde la tienda | Queda "en espera" (`on-hold`) | ✅ |
| 2 | El ERP consultó la cola de pedidos nuevos | El pedido aparece | ✅ |
| 3 | El ERP confirmó el pedido con su número de orden de compra | Pasa a "pendiente" | ✅ |
| 4 | Se volvió a consultar la cola | El pedido **ya no aparece** (correcto) | ✅ |
| 5 | El ERP facturó el pedido | Pasa a "completado" con su fecha | ✅ |
| 6 | Se intentó reconfirmar con **otra** orden de compra | Rechazado correctamente | ✅ |

**El ciclo completo funciona.** ✅

## ⚠️ Hallazgo 4 — Reconfirmar un pedido ya facturado

**Gravedad: media.** Detectado y verificado en vivo.

En el paso 6 se descubrió lo siguiente:

- Si el ERP intenta reconfirmar un pedido ya facturado usando **una orden de compra distinta**,
  el sistema responde correctamente con un error 400 y el mensaje
  *"Only on-hold orders can be acknowledged. Current status: completed"*. ✅
- Pero si lo intenta usando **la misma orden de compra**, el sistema responde **200 (todo bien)**
  y devuelve el pedido, que sigue estando en "completado".

**El riesgo:** si el ERP solo mira el código de respuesta y ve "200 = todo bien", va a creer
que dejó el pedido en estado "pendiente", cuando en realidad está "completado". Los dos
sistemas quedan desincronizados sin que nadie se entere.

**Recomendación:** hablarlo con el equipo de OrbisNet mañana. Lo más simple es que el ERP
lea también el estado que viene en la respuesta, no solo el código. Del lado de la tienda,
lo correcto sería devolver un código que indique "no hice nada porque ya estaba así".

## 11.5 Consultas de lectura del ERP (9 pruebas)

| # | Qué se probó | Resultado | ✔ |
|---|--------------|-----------|---|
| 11.18 | Listar todos los pedidos | Funciona | ✅ |
| 11.19 | Listar la cola de pedidos nuevos, paginada | Funciona | ✅ |
| 11.20 | Consultar un pedido que no existe | Avisa correctamente | ✅ |
| 11.21 | Listar productos | Funciona | ✅ |
| 11.22 | Listar categorías | Funciona | ✅ |
| 11.23 | Listar clientes | Funciona | ✅ |
| 11.24 | Consultar los datos de la tienda | Funciona | ✅ |
| 11.25 | Pedir 100.000 pedidos de un golpe | No tumba el servidor | ⚠️ sin tope |
| 11.26 | Pedir una página negativa | ❌ Error interno 500 | ❌ Hallazgo 2 |

**Total de la Parte 11: 26 pruebas, 25 pasaron.**

---

# Parte 12 — Panel de administración

Se recorrió el panel completo en pantalla de escritorio (1440 × 900), revisando las 16
pantallas y capturando cada una.

| # | Pantalla | Carga | Sin errores | ✔ |
|---|----------|-------|-------------|---|
| 12.1 | Inicio de sesión del panel | Sí | Sí | ✅ |
| 12.2 | Rechaza credenciales incorrectas | Sí | Sí | ✅ |
| 12.3 | Panel principal con métricas | Sí | Sí | ✅ |
| 12.4 | Listado de órdenes | Sí | Sí | ✅ |
| 12.5 | Detalle de una orden | Sí | Sí | ✅ |
| 12.6 | Listado de productos | Sí | Sí | ✅ |
| 12.7 | Formulario de producto nuevo | Sí | Sí | ✅ |
| 12.8 | Categorías | Sí | Sí | ✅ |
| 12.9 | Clientes | Sí | Sí | ✅ |
| 12.10 | Cupones de descuento | Sí | Sí | ✅ |
| 12.11 | Banners | Sí | Sí | ✅ |
| 12.12 | Usuarios del panel | Sí | Sí | ✅ |
| 12.13 | Invitaciones | Sí | Sí | ✅ |
| 12.14 | Llaves de API (para el ERP) | Sí | Sí | ✅ |
| 12.15 | Registro de llamadas de la API | Sí | Sí | ✅ |
| 12.16 | Registro de auditoría | Sí | Sí | ✅ |
| 12.17 | Ayuda | Sí | Sí | ✅ |

**Resultado: 17 de 17 pantallas funcionan, sin un solo error de JavaScript en todo el recorrido.** ✅

Además se verificó que:

- El panel **rechaza** el ingreso con contraseña incorrecta. ✅
- El listado de órdenes muestra filtros por estado, buscador y exportación a CSV. ✅
- El nombre malicioso que se registró en la prueba 2.7 se muestra **como texto plano**,
  confirmando que no hay riesgo de ejecución de código en el panel. ✅

⚠️ **Observación menor:** en el detalle de una orden no se detectó la palabra "IVA" de forma
automática. Puede ser que se muestre con otra etiqueta (por ejemplo "Impuesto"). Conviene
echarle un ojo manualmente; no es un error de funcionamiento.

---

# Parte 13 — Correos electrónicos

Se montó un buzón de pruebas local para capturar los correos sin enviarlos de verdad, y se
revisó su contenido.

| # | Qué se probó | Resultado | ✔ |
|---|--------------|-----------|---|
| 13.1 | Se envía la confirmación al cliente al comprar | Sí | ✅ |
| 13.2 | Se envía el aviso al administrador | Sí | ✅ |
| 13.3 | Se envía el correo de bienvenida al registrarse | Sí | ✅ |
| 13.4 | Se envía el aviso de pago confirmado | Sí | ✅ |
| 13.5 | Los montos del correo cuadran con el pedido | Sí | ✅ |
| 13.6 | **Intento de ataque:** código malicioso en el nombre del cliente | No aparece código ejecutable | ✅ |
| 13.7 | El correo muestra el **nombre** del cliente | No: muestra el correo | ❌ **Hallazgo 5** |
| 13.8 | El correo dice la ciudad correcta de la tienda | No: dice Caracas | ❌ **Hallazgo 6** |

## ❌ Hallazgo 5 — Los correos muestran el correo del cliente en vez de su nombre

**Gravedad: baja (pero visible para el cliente).**

Se hizo un pedido a nombre de **María González**. El aviso que le llega al administrador dice:

```
Cliente     maria.gonzalez@local.test
Correo      maria.gonzalez@local.test
```

Es decir, el nombre no aparece por ningún lado y el correo sale repetido dos veces.

**Por qué pasa.** En `src/email/email.service.ts`, líneas 342 a 344, el sistema busca el
nombre en la dirección de envío o en la cuenta del usuario. Un cliente **invitado que retira
en tienda** no tiene ninguna de las dos, así que cae en la última opción, que es el correo.

El dato **sí existe**: está guardado en la ficha del cliente invitado (`guestCustomer`), con
su nombre y apellido. Simplemente no se consulta.

**Cómo se arregla:** agregar la ficha del cliente invitado a la lista de lugares donde
buscar el nombre. Es un cambio de una o dos líneas, en dos funciones
(`customerName()` en la línea 149, y el bloque de la línea 342).

## ❌ Hallazgo 6 — Los correos dicen que la tienda está en Caracas

**Gravedad: baja, pero afecta la imagen ante el cliente.**

**Las 10 plantillas de correo** tienen escrito en el pie de página:

```
Constru-ir · Materiales de construcción · Caracas, Venezuela
```

La tienda está en **Ciudad Bolívar, Estado Bolívar**, como bien indica la configuración
(`STORE_CITY`). El texto está escrito a mano dentro de cada plantilla y no toma el dato de
la configuración.

Plantillas afectadas: confirmación de pedido, aviso al administrador, bienvenida,
verificación de correo, recuperación de contraseña, invitación, pago confirmado, pago
rechazado, pedido enviado y pedido listo para retirar.

**Cómo se arregla:** reemplazar el texto fijo por el dato de configuración en las 10 plantillas.

---

# Parte 14 — Verificaciones contra el sitio en producción

Se hicieron consultas de **solo lectura** contra el sitio real. **No se creó ningún pedido,
no se modificó nada y no se envió ningún correo.**

| # | Qué se verificó | Resultado | ✔ |
|---|-----------------|-----------|---|
| 14.1 | El backend responde | Sí | ✅ |
| 14.2 | El catálogo carga con imágenes | Sí (imágenes servidas desde S3) | ✅ |
| 14.3 | El carrito calcula bien | Sí, cuadra al céntimo | ✅ |
| 14.4 | El checkout llega hasta los métodos de pago | Sí: Zelle, Pago Móvil y Transferencia activos | ✅ |
| 14.5 | Los datos de la tienda salen configurados | **No** | ❌ **Hallazgo 7** |
| 14.6 | La tasa de cambio está al día | Del 30 de julio (2 días de atraso) | ⚠️ **Hallazgo 8** |
| 14.7 | El error de paginación también ocurre en producción | Sí, ocurre | ❌ Hallazgo 2 |

**Verificación de los montos en producción** (producto real del catálogo):

```
Subtotal   Bs. 145.033,87
IVA        Bs.  23.205,42
Total      Bs. 168.239,29     ✅ (145.033,87 + 23.205,42 = 168.239,29)
```

## ❌ Hallazgo 7 — Faltan los datos de la tienda en el servidor de producción

**Gravedad: media.** Afecta a lo que ve el cliente.

La consulta de datos de la tienda en producción devuelve todo vacío:

```json
{"name":"Construir","address":"","city":"","phone":"","email":"","hours":"","mapUrl":""}
```

En el entorno local, con la configuración completa, devuelve correctamente la dirección, el
teléfono, el horario y el correo.

**Consecuencia comprobada:** se llegó hasta el paso de entrega en el sitio real y **los datos
de la tienda no aparecen**. Un cliente que elija "Retiro en tienda" no ve dónde queda la
tienda, ni el teléfono, ni el horario. Los correos de retiro en tienda también salen
incompletos.

**Por qué pasa.** Faltan las variables de configuración `STORE_ADDRESS`, `STORE_CITY`,
`STORE_PHONE`, `STORE_HOURS`, `STORE_EMAIL`, `STORE_MAP_URL`, `STORE_WHATSAPP_URL` y
`STORE_RIF` en el archivo de configuración del servidor.

**Cómo se arregla.** Es solo configuración, no requiere cambiar código. En el servidor, agregar
esas variables al archivo `.env` (los valores correctos ya están en el `.env` local del
proyecto) y reiniciar el contenedor.

**No se aplicó este arreglo** porque toca el servidor en vivo y usted pidió solo reportarlo.
Queda listo para aplicarse mañana en unos minutos.

## ⚠️ Hallazgo 8 — La tasa de cambio tiene 2 días de atraso

En producción la tasa vigente es del **30 de julio** (Bs. 745,64) y hoy es **1 de agosto**.

El sistema tiene dos tareas programadas para actualizarla (una diaria a la 1:00 AM y otra
cada 20 minutos en horario hábil). Que la tasa tenga dos días implica que **esas tareas no
se están ejecutando o están fallando en silencio**.

**Impacto:** los precios en bolívares se calculan con una tasa vieja. Si la tasa oficial
subió en estos dos días, se está vendiendo por debajo del valor real.

**Recomendación: revisarlo antes de la prueba con el cliente.** Conviene mirar los registros
del servidor para ver si la tarea está fallando, y verificar que la llave de acceso al
servicio de tasas (`BCV_RATES_API_KEY`) esté configurada en producción.

---

# Parte 15 — Un defecto que impedía arrancar el sistema

## ❌ Hallazgo 9 — El backend no arrancaba en la rama de trabajo actual

**Gravedad: bloqueante (ya corregido).**

Al levantar el sistema para empezar las pruebas, **el backend no arrancó**. El error:

```
Nest can't resolve dependencies of the EmailService (ConfigService, ?).
Please make sure that the argument EmailPayloadBuilder at index [1]
is available in the OrdersModule context.
```

**Qué pasaba.** El trabajo reciente sobre los correos introdujo un componente nuevo
(`EmailPayloadBuilder`). El módulo de pedidos declaraba el servicio de correo como si fuera
suyo, en vez de tomarlo prestado del módulo de correos. Al hacerlo, el sistema intentaba
armar el servicio de correo dentro del módulo de pedidos, donde el componente nuevo no
estaba disponible.

**Alcance.** Solo afecta a la rama `feat/tasa-publicada-servicio-central`. La rama principal
(`main`), que es la que está en producción, **no tiene este problema** y funciona bien.

**Corregido.** Se aplicó el arreglo en `src/orders/orders.module.ts`: se importa el módulo
de correos y se quita la declaración duplicada. El sistema arranca correctamente y mapea
sus 138 rutas.

## ⚠️ Hallazgo 10 — Las imágenes locales no se servían

**Gravedad: baja. No afecta producción.**

La ruta configurada para servir archivos apuntaba a una carpeta que no existe. El archivo
principal queda en `dist/src/`, y la ruta subía un solo nivel (`dist/public`), cuando la
carpeta real está en la raíz del proyecto.

**No afecta producción** porque allá las imágenes se sirven desde Amazon S3. Se verificó:
de 100 productos revisados en producción, 99 tienen su imagen en S3 y cargan correctamente.

**Corregido** en `src/main.ts` para que la ruta se resuelva desde la raíz del proyecto.

---

# Parte 16 — Riesgo de despliegue detectado

⚠️ **Si faltan ciertas variables de configuración en el sitio, nadie puede comprar.**

Durante las pruebas se levantó el frontend sin las variables de los métodos de pago
(`NEXT_PUBLIC_ZELLE_ENABLED`, `NEXT_PUBLIC_PAGOMOVIL_ENABLED`,
`NEXT_PUBLIC_TRANSFERENCIA_ENABLED`). El resultado fue que el paso final del checkout
mostraba:

> **Pagos en línea próximamente**
> Estamos configurando los métodos de pago para ofrecerte la mejor experiencia.
> Por ahora, contáctanos directamente para completar tu pedido.

El sistema **no da ningún error**: simplemente deja de ofrecer formas de pago, y **ningún
cliente puede completar una compra**.

**Se verificó en producción y hoy está bien:** los tres métodos de pago aparecen correctamente.

**Recomendación:** dejar esta comprobación anotada en la lista de verificación de cada
despliegue. Es un fallo silencioso —no rompe nada visiblemente— pero detiene las ventas por
completo. Dado que ya se detectó que en producción faltan las variables `STORE_*`
(Hallazgo 7), este riesgo no es teórico.

---

# Resumen de todos los hallazgos

| # | Hallazgo | Gravedad | Estado | Dónde |
|---|----------|----------|--------|-------|
| 1 | Sobreventa por producto repetido en el carrito | 🔴 Alta | Pendiente | `orders.service.ts:457-479` |
| 1b | Sobreventa por compras simultáneas | 🔴 Alta | Pendiente (ya documentado) | `orders.service.ts` |
| 2 | Error interno 500 ante datos mal escritos | 🟠 Media | Pendiente | Paginación e identificadores |
| 3 | Producto inexistente en la cotización | 🟠 Media-baja | Pendiente | `orders.service.ts` |
| 4 | Reconfirmar pedido facturado responde "todo bien" | 🟠 Media | Conversar con OrbisNet | API v1 |
| 5 | Los correos muestran el correo en vez del nombre | 🟡 Baja | Pendiente | `email.service.ts:342-344` |
| 6 | Los correos dicen "Caracas" | 🟡 Baja | Pendiente | 10 plantillas |
| 7 | Faltan los datos de la tienda en producción | 🟠 Media | Pendiente (solo configuración) | `.env` del servidor |
| 8 | La tasa de cambio tiene 2 días de atraso | 🟠 Media | **Revisar antes de la prueba** | Tarea programada |
| 9 | El backend no arrancaba en la rama actual | 🔴 Bloqueante | ✅ **Corregido** | `orders.module.ts` |
| 10 | Las imágenes locales no se servían | 🟡 Baja | ✅ **Corregido** | `main.ts` |

## Qué se recomienda hacer antes de la prueba con el cliente

**Prioridad 1 — antes de la reunión:**

1. Revisar por qué la tasa de cambio no se está actualizando (Hallazgo 8). Es lo único que
   puede afectar los montos que se le muestren al cliente mañana.
2. Cargar las variables `STORE_*` en el servidor (Hallazgo 7). Son cinco minutos y mejora
   mucho lo que ve el cliente en el paso de retiro en tienda.

**Prioridad 2 — esta semana:**

3. Corregir la sobreventa por producto repetido (Hallazgo 1). Es el arreglo más sencillo de
   los dos y cierra la vía que se puede provocar desde una sola petición.
4. Validar los parámetros de paginación para eliminar los errores 500 (Hallazgo 2).

**Prioridad 3 — cuando haya espacio:**

5. Arreglar el nombre y la ciudad en los correos (Hallazgos 5 y 6). Son cambios pequeños y
   se ven bien de cara al cliente.
6. Planificar la transacción y el bloqueo de inventario para las compras simultáneas
   (Hallazgo 1b).
7. Conversar el punto de la reconfirmación con el equipo de OrbisNet (Hallazgo 4).

---

# Anexo — Cómo se hicieron estas pruebas

**Herramientas usadas:**

- Pruebas de la API: peticiones directas al servidor con `curl`, agrupadas en guiones que
  comparan la respuesta obtenida contra la esperada.
- Pruebas de navegador: Playwright con Chromium, simulando un celular (390 × 844) para el
  lado del cliente y un escritorio (1440 × 900) para el panel de administración.
- Correos: un buzón SMTP local que captura los mensajes en vez de enviarlos, para poder
  leer su contenido.
- Base de datos: consultas directas a PostgreSQL para comprobar que lo que dice la pantalla
  coincide con lo que quedó guardado.

**Datos de prueba.** Todo lo creado durante las pruebas (pedidos, cuentas, clientes
invitados) **fue borrado al terminar**. La base de datos local quedó con los mismos 12
pedidos, 5 usuarios y el inventario intacto. Se verificó expresamente que no quedaran
productos con inventario negativo.

**Sobre los correos enviados por accidente.** Al inicio de las pruebas, el entorno local
estaba configurado con las credenciales reales de Brevo. Antes de detectarlo, se enviaron
**7 correos reales** a `diohandres1703@hotmail.com` (avisos de pedido nuevo de pedidos de
prueba). En cuanto se detectó, se redirigió todo el correo a un buzón local y no volvió a
salir ningún mensaje real. Queda anotado porque consumió una pequeña parte de la cuota de
Brevo y porque esos avisos en la bandeja de entrada no corresponden a pedidos reales.

**Sobre producción.** Todo lo hecho contra el sitio real fue de solo lectura: consultas de
catálogo, de configuración y navegación del checkout hasta el paso de pago **sin llegar a
confirmar ningún pedido**. No se creó ningún pedido, no se modificó ningún dato y no se
envió ningún correo desde producción.

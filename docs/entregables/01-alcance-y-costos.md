# Construir — Qué se construyó, qué vale y qué se cobra

**Fecha:** agosto de 2026
**Período de trabajo:** noviembre de 2025 – agosto de 2026 (9 meses)

---

## 1. Resumen en una página

Se construyó, desde cero, la tienda en línea de Construir y el sistema que la
sostiene por detrás. No es una plantilla ni un sitio armado con módulos
comprados: es un sistema hecho a la medida del negocio, con el catálogo real de
la ferretería, el manejo de dólares y bolívares como se maneja en Venezuela, y
una conexión directa con OrbisNet, el ERP (el sistema administrativo donde la
empresa lleva su inventario y su facturación).

**Lo que hay hoy funcionando:**

- Una tienda pública en `constru-ir.com` con 1.269 productos y 102 categorías.
- Un panel de administración completo para manejar productos, pedidos,
  clientes, cupones, banners y usuarios.
- Un sistema de precios que convierte solo de dólares a bolívares con la tasa
  oficial del BCV, y que calcula el IVA producto por producto.
- Compra sin registrarse o con cuenta, con tres formas de pago venezolanas
  (Pago Móvil, Zelle y transferencia) y carga del comprobante por parte del
  cliente.
- Correos automáticos al cliente y al administrador en cada paso del pedido.
- Una API (la puerta por la que otro sistema se conecta a este) para que
  OrbisNet lea los pedidos y devuelva su estado.
- Publicación automática de cambios: se aprueba un cambio y sale al aire solo.

**Los números:**

| Concepto | Cantidad |
|---|---|
| Líneas de código escritas | ~48.800 |
| Cambios registrados (commits) | 251 |
| Pantallas del sitio | 45 |
| Pruebas automatizadas | 78 archivos |
| Tiempo de trabajo | 9 meses |

**El dinero:**

| Concepto | Monto |
|---|---|
| Valor de mercado estimado del trabajo | **$7.716,00** |
| Precio promocional acordado | **$400,00** |
| Descuento | **94,8%** |
| Costo mensual de operación (hoy) | **$5,10 a $6,35** + Brevo (por confirmar) |

---

## 2. Qué se construyó, explicado por partes

### 2.1 El catálogo

Se pasaron 1.269 productos, 102 categorías y 1.826 imágenes desde el WordPress
viejo al sistema nuevo. Eso no fue copiar y pegar: hubo que reordenar los
datos, arreglar las direcciones de las imágenes que apuntaban al servidor
anterior y descargarlas una por una.

Cada producto tiene su código SKU (el código interno con que la empresa
identifica cada artículo), varias imágenes, inventario, categoría y tipo de
IVA. Las categorías se organizan en árbol (categoría y subcategoría) y cada una
guarda además un "código externo", que es la llave con la que se amarra a la
categoría equivalente en OrbisNet.

Desde el panel se pueden publicar o despublicar productos en lote, marcarlos
como destacados, subir y ordenar imágenes, y ver un listado de artículos con
inventario bajo.

### 2.2 Dólares, bolívares y el IVA

Este es el corazón del sistema y es lo que más trabajo llevó.

Los productos se guardan en dólares y **sin IVA**. Todo lo demás el sistema lo
calcula: el IVA según la alícuota que le toque a cada producto (16% normal, 24%
de lujo, o exento), el precio final en dólares y el precio en bolívares.

La tasa del BCV entra sola. El sistema consulta la tasa oficial publicada a
través de un servicio propio que la lee directamente del sitio del Banco
Central. Consulta dos veces:

- Todos los días a la 1:00 de la madrugada, hora de Caracas.
- Cada 20 minutos entre las 12:00 del mediodía y las 11:00 de la noche, de
  lunes a viernes, que es la ventana en que el BCV publica la tasa del día
  siguiente.

Cuando detecta una tasa nueva, recalcula los precios en bolívares de los 1.269
productos. Si la tasa no cambió, no toca nada, para no cargar el servidor sin
necesidad. Y si el BCV no responde, el sistema sigue trabajando con la última
tasa guardada en lugar de quedarse sin precios.

Sobre el IVA hay una decisión importante: el precio que el cliente ve en el
catálogo es el precio final, con IVA incluido. En el checkout ese mismo número
se descompone hacia atrás para mostrar base más IVA. El total nunca cambia
entre lo que el cliente vio en la vitrina y lo que paga; solo se explica. El
IVA se extrae línea por línea, con la alícuota propia de cada producto, para no
cobrarle IVA a los productos exentos cuando van en el mismo carrito con
productos gravados.

Los descuentos por cupón se reparten proporcionalmente entre las líneas del
pedido, con topes para que ninguna línea quede en negativo, y el redondeo está
hecho de forma que la suma de los renglones siempre dé exactamente el total.
Suena a detalle menor; es la diferencia entre una factura que cuadra y una que
no.

También hay una protección contra el caso incómodo: si el cliente se demora en
el checkout y la tasa cambia mientras tanto, el sistema no cobra con la tasa
vieja ni cobra en silencio con la nueva. Detiene la operación, avisa y muestra
el monto actualizado.

Todo esto está documentado en detalle en `docs/pricing-iva.md`.

### 2.3 Carrito, compra y pago

El cliente puede comprar de dos maneras: creando una cuenta, o como invitado
sin registrarse. En el modo invitado, si ya compró antes, con solo escribir su
cédula el formulario se le llena solo con los datos de la vez anterior.

Formas de pago habilitadas: Pago Móvil, Zelle y transferencia bancaria. Cada
una pide los datos que le corresponden (banco, teléfono, cédula, número de
referencia, nombre del emisor) y el cliente puede subir la foto del
comprobante, que queda guardada junto al pedido para que el administrador la
revise y marque el pago como verificado o rechazado.

El pedido pasa por cuatro estados: en espera (recién creado), pendiente
(recibido por el ERP), completado (facturado) y anulado. El cliente puede
consultar su pedido en cualquier momento con el número de orden, sin necesidad
de tener cuenta.

### 2.4 El panel de administración

Catorce pantallas para manejar el negocio sin tocar código:

- Productos: crear, editar, subir imágenes, publicar en lote, ver inventario bajo.
- Categorías y su jerarquía.
- Pedidos: listado con filtros, detalle, cambio de estado, exportación a Excel.
- Clientes registrados y clientes invitados.
- Cupones de descuento.
- Banners de la página de inicio.
- Usuarios del sistema e invitaciones para dar de alta a personal nuevo.
- Llaves de API y su historial de uso.
- Bitácora de auditoría.
- Tablero con analíticas de ventas y páginas más visitadas.
- Una sección de ayuda.

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

Los correos salen por Brevo, un servicio especializado en envío de correo. Se
usa ese servicio y no el correo común porque los correos automáticos enviados
desde un servidor propio suelen caer en spam.

### 2.6 La conexión con OrbisNet (el ERP)

Esta es la parte que más valor le da al sistema y la que casi nadie incluye en
una tienda armada con plantillas.

Se construyó una API pública versión 1, documentada, con su propio sistema de
llaves de acceso. Cada llave tiene permisos: solo lectura, solo escritura, o
ambos. Con eso, OrbisNet puede:

- Consultar el catálogo de productos y categorías.
- Actualizar el precio y el inventario de un producto por su SKU.
- Leer los pedidos nuevos que están en espera.
- Confirmar que recibió un pedido.
- Devolver el estado de un pedido cuando lo factura o lo anula.

La documentación de esa API es automática (Swagger), o sea que el técnico del
lado de OrbisNet entra a una dirección web y ve todas las operaciones
disponibles con ejemplos, sin que nadie le tenga que explicar nada por
teléfono.

Un detalle que costó trabajo y que vale la pena mencionar: el formato en que
OrbisNet espera los montos no es el mismo en que los guarda Construir. OrbisNet
quiere el renglón sin IVA y el IVA aparte; Construir maneja el precio con IVA
incluido. Se escribió un traductor entre los dos formatos, con sus pruebas
automatizadas, para que los montos que le llegan al ERP sean exactamente los
correctos.

### 2.7 Avisos automáticos a sistemas externos (webhooks)

Además de que OrbisNet pregunte, el sistema puede avisar. Hay nueve tipos de
avisos configurables: producto creado, actualizado o eliminado; pedido creado,
actualizado o con cambio de estado; cliente creado, actualizado o eliminado.
Quien quiera enterarse registra una dirección web y el sistema le toca la
puerta cuando pasa algo.

### 2.8 Seguridad y control

- Inicio de sesión con token (una credencial temporal que expira sola).
- Roles: administrador general, administrador de pedidos y cliente. Cada uno ve
  y hace solo lo que le toca.
- Alta de personal por invitación, no por registro abierto.
- Verificación de correo y recuperación de contraseña.
- Límite de solicitudes por minuto en las rutas sensibles, para frenar a quien
  intente adivinar contraseñas o barrer datos.
- **Bitácora de auditoría:** queda registrado quién creó, modificó o eliminó
  qué cosa en el panel, y cuándo.
- **Registro de llamadas a la API:** cada consulta que hace OrbisNet queda
  anotada, con su llave, su resultado y su tiempo de respuesta. Si mañana hay
  una discusión sobre "el sistema no me mandó el pedido", hay cómo revisarlo.

### 2.9 Publicación automática

Cada cambio aprobado se publica solo en el servidor: se descarga el código
nuevo, se arma el paquete, se aplican los cambios pendientes de base de datos y
se levanta la versión nueva. Sin que nadie tenga que entrar al servidor a mano.
Eso reduce el riesgo de que un despliegue rompa algo por un paso olvidado.

### 2.10 Pruebas automatizadas

78 archivos de pruebas que se ejecutan solos y verifican que el sistema haga lo
que debe: 42 en el sistema de fondo, 29 en el sitio web y 7 pruebas de
recorrido completo (que simulan a un usuario real comprando, iniciando sesión,
creando un producto).

Esto no se ve, pero es lo que evita que arreglar una cosa rompa otra tres meses
después.

---

## 3. El detalle técnico en números

| Métrica | Sistema de fondo (backend) | Sitio web (frontend) | Total |
|---|---|---|---|
| Líneas de código de producción | 17.918 | 30.888 | 48.806 |
| Líneas de pruebas | 6.662 | (incluidas arriba) | — |
| Archivos de pruebas | 42 | 29 + 7 de recorrido | 78 |
| Cambios registrados (commits) | 147 | 104 | 251 |
| Pantallas | — | 45 | 45 |
| Componentes reutilizables | — | 101 | 101 |
| Módulos funcionales | 23 | — | 23 |
| Rutas de API (endpoints) | 139 | — | 139 |
| Tablas de base de datos | 21 | — | 21 |
| Migraciones de base de datos | 23 | — | 23 |
| Plantillas de correo | 10 + 2 parciales | — | 12 |
| Tipos de aviso automático | 9 | — | 9 |
| Idiomas soportados | — | 2 (español, inglés) | 2 |

**Contenido cargado:** 1.269 productos, 102 categorías, 1.826 imágenes.

Tecnologías: NestJS con PostgreSQL del lado del servidor; Next.js 16 con React
y Tailwind del lado del sitio; Docker para el empaquetado; GitHub Actions para
la publicación automática; Amazon S3 para las imágenes nuevas.

---

## 4. Valorización del trabajo

**Tarifa de referencia: $12,00 por hora.** Es el punto medio del rango que
cobra hoy un desarrollador full-stack semi-senior en Venezuela, que va de $8,00
a $15,00 la hora.

> **Nota de honestidad:** las horas de abajo son **estimaciones**, no un
> registro de reloj. No se llevó una planilla de horas durante el proyecto. Son
> una reconstrucción del esfuerzo mirando el código entregado, y están
> calculadas del lado conservador: para cada bloque se estimó lo que tomaría
> hacerlo bien, no lo máximo que se le podría cargar.

| # | Bloque de trabajo | Horas | Monto |
|---|---|---:|---:|
| 1 | Arquitectura base, base de datos, configuración y empaquetado | 32 | $384,00 |
| 2 | Catálogo de productos, imágenes, inventario y publicación en lote | 42 | $504,00 |
| 3 | Migración del catálogo desde WordPress (1.269 productos, 1.826 imágenes) | 18 | $216,00 |
| 4 | Categorías jerárquicas y su mapeo con el ERP | 12 | $144,00 |
| 5 | Tasa de cambio BCV, trabajos programados y recálculo del catálogo | 26 | $312,00 |
| 6 | Motor de precios e IVA (desglose, prorrateo de descuentos, redondeo) | 40 | $480,00 |
| 7 | Carrito y checkout (invitado y con cuenta, autocompletado por cédula) | 40 | $480,00 |
| 8 | Formas de pago venezolanas y carga de comprobantes | 18 | $216,00 |
| 9 | Pedidos: estados, seguimiento, anulación, exportación | 32 | $384,00 |
| 10 | Correos transaccionales (10 plantillas + integración con Brevo) | 26 | $312,00 |
| 11 | API pública v1, llaves, permisos, Swagger y traductor para OrbisNet | 40 | $480,00 |
| 12 | Avisos automáticos a sistemas externos (webhooks) | 12 | $144,00 |
| 13 | Bitácora de auditoría y registro de llamadas a la API | 14 | $168,00 |
| 14 | Seguridad: sesiones, roles, invitaciones, verificación, recuperación | 32 | $384,00 |
| 15 | Panel de administración (14 pantallas) | 65 | $780,00 |
| 16 | Tienda pública (18 pantallas, diseño adaptable, dos idiomas) | 80 | $960,00 |
| 17 | Cupones de descuento y banners | 18 | $216,00 |
| 18 | Analíticas y tablero | 14 | $168,00 |
| 19 | Pruebas automatizadas (78 archivos) | 50 | $600,00 |
| 20 | Servidor, Docker, certificado SSL y publicación automática | 22 | $264,00 |
| 21 | Documentación técnica y guiones de prueba | 10 | $120,00 |
| | **TOTAL** | **643** | **$7.716,00** |

**Rango según la tarifa que se use:**

| Tarifa | Total |
|---|---:|
| $8,00/hora (extremo bajo del mercado) | $5.144,00 |
| **$12,00/hora (referencia usada)** | **$7.716,00** |
| $15,00/hora (extremo alto del mercado) | $9.645,00 |

Para poner las 643 horas en perspectiva: repartidas en los 9 meses del
proyecto, son unas 18 horas por semana. Es coherente con un proyecto trabajado
de forma sostenida pero no a tiempo completo, y con los 251 cambios registrados
en el historial.

---

## 5. Comparación con las alternativas del mercado

| Alternativa | Costo de desarrollo | Mensualidad | ¿Se conecta al ERP? |
|---|---|---|---|
| Agencia venezolana, e-commerce a la medida con integración a ERP | $3.000 a $8.000 | Variable | Sí |
| Tienda en Shopify o WooCommerce, sin integración | $800 a $2.000 | $29 a $105/mes (Shopify) o alojamiento + plugins | No |
| **Este proyecto** | **$400** | **~$5 a $6** | **Sí** |

Dos aclaratorias para que la comparación sea justa:

**Contra la agencia.** La estimación de $7.716,00 cae en el extremo alto del
rango de agencia, y tiene sentido: la mayoría de los proyectos de ese rango no
incluyen integración con un ERP, ni un motor de IVA por alícuota, ni manejo
automático de tasa de cambio. Este sí. Una agencia que cotice exactamente este
alcance difícilmente baje de $6.000.

**Contra Shopify o WooCommerce.** Es cierto que armar una tienda en esas
plataformas sale más barato de entrada. Pero: (a) el precio de $800 a $2.000 es
solo la puesta en marcha, y encima corre una mensualidad de por vida; (b)
ninguna de las dos entiende de tasa BCV ni de IVA de lujo venezolano sin
programación adicional; (c) conectar cualquiera de las dos con OrbisNet es un
desarrollo aparte, que se cotiza aparte, y suele costar más que la tienda
misma; (d) Pago Móvil y la carga de comprobantes tampoco vienen de fábrica.

Dicho sin adornos: con esas plataformas usted terminaría pagando más, todos los
meses, por un sistema que no habla con su ERP.

---

## 6. Costos recurrentes mensuales

Todo lo de esta sección son cifras reales consultadas en la cuenta de AWS,
salvo lo que está marcado como pendiente o a confirmar.

### 6.1 El servidor

El sistema corre en un servidor de Amazon (AWS EC2), instancia t3.small, en la
región de Virginia, Estados Unidos. Tiene 2 procesadores, 2 GB de memoria y 20
GB de disco, con Ubuntu 24.04. Lleva 161 días encendido sin reiniciarse.

**Acá hay que ser transparente:** ese servidor **no es exclusivo de Construir**.
Aloja cinco cosas a la vez: Construir, su base de datos, Cambios Los
Criollitos, el servicio de tasas del BCV y Charcumarket. Por eso hay que
presentar dos cifras distintas.

**(a) Lo que costaría si el servidor fuera solo de Construir:**

| Renglón | Costo mensual |
|---|---:|
| Cómputo (instancia t3.small) | $15,18 |
| Disco (20 GB) | $1,60 |
| Dirección IP fija | $3,65 |
| **Subtotal** | **$20,43** |

**(b) Lo que realmente se le puede imputar hoy a Construir**, repartiendo el
costo entre los cinco proyectos que comparten la máquina: **$4,00 a $5,00 al
mes**.

Hoy se paga (b). Si mañana el tráfico crece y Construir necesita su propio
servidor, sube a (a) o más, dependiendo del tamaño de la máquina que haga falta.

### 6.2 La factura de AWS, mes por mes

Esta es la factura **total de la cuenta**, que incluye todos los proyectos, no
solo Construir:

| Mes | Monto |
|---|---:|
| Noviembre 2025 | $20,83 |
| Diciembre 2025 | $21,45 |
| Enero 2026 | $21,45 |
| Febrero 2026 | $19,61 |
| Marzo 2026 | $21,47 |
| Abril 2026 | $20,86 |
| Mayo 2026 | $21,47 |
| Junio 2026 | $37,78 |
| Julio 2026 | $74,96 |

**El salto de junio y julio no es de Construir.** Se debe a que en esos meses se
prendieron bases de datos administradas (RDS) y servidores adicionales para
**otros** proyectos de la misma cuenta. El consumo de Construir se mantuvo
estable todo el período.

### 6.3 Los demás renglones

| Renglón | Costo mensual | Estado |
|---|---:|---|
| Servidor (parte imputable a Construir, hoy) | $4,00 – $5,00 | Verificado |
| Almacenamiento de imágenes en Amazon S3 | menos de $0,10 | Verificado |
| Alojamiento del sitio web en Vercel | $0,00 | Verificado — plan gratuito |
| Certificado SSL (el candado del navegador) | $0,00 | Verificado — Let's Encrypt, se renueva solo |
| Dominio `.com` | ~$1,00 – $1,25 (equivale a $12–15 al año) | **A confirmar con usted** |
| Envío de correos (Brevo) | **?** | **PENDIENTE POR CONFIRMAR** |
| **Total conocido hoy** | **$5,10 – $6,35** | Sin incluir Brevo |

### 6.4 Renglón pendiente: Brevo

> ### ⚠ PENDIENTE POR CONFIRMAR — Costo de Brevo
>
> **No fue posible verificar este costo.** No hay acceso a la cuenta de Brevo
> desde el equipo donde se preparó este documento. El sistema está configurado
> y enviando correos por `smtp-relay.brevo.com`, pero no se pudo consultar qué
> plan está activo ni cuánto se paga.
>
> Por favor complete:
>
> | Dato | Valor |
> |---|---|
> | Plan contratado | ____________________ |
> | Monto mensual | $ ___________________ |
> | Se paga desde (mes/año) | ____________________ |
> | ¿Quién lo paga hoy? | ____________________ |
>
> **Referencia de mercado únicamente** (no es el monto de este proyecto): Brevo
> tiene un plan gratuito de hasta 300 correos al día, y su plan Starter ronda
> los $25,00 al mes. **Esto es lo que Brevo cobra en general, no lo que se está
> pagando acá.** El número real hay que sacarlo de la cuenta.

### 6.5 El ahorro que ya está incorporado

Vale la pena señalarlo: el sitio web está alojado en Vercel con plan gratuito
($0,00 al mes) y el certificado de seguridad es Let's Encrypt, gratis y con
renovación automática. En una configuración tradicional, esos dos renglones
sumarían fácilmente entre $20,00 y $70,00 al mes.

---

## 7. Precio final

| | |
|---|---:|
| Valor de mercado estimado del trabajo | $7.716,00 |
| **Precio promocional acordado** | **$400,00** |
| Diferencia | $7.316,00 |
| **Descuento** | **94,8%** |

Pago único. No es una mensualidad ni una suscripción.

Visto de otra manera: $400,00 sobre 643 horas de trabajo equivalen a $0,62 la
hora.

### Por qué el precio es promocional

Construir es el primer cliente del ramo ferretero y de materiales de
construcción para este trabajo, y el proyecto sirve como caso de referencia
demostrable para conseguir los siguientes. A eso se suma la relación de
confianza previa entre las partes. El precio refleja esas dos cosas, y no la
magnitud del trabajo entregado. No es una tarifa que se pueda sostener para un
cliente nuevo sin esas condiciones.

### Qué incluye los $400,00

- El código fuente completo de los dos proyectos (el sistema de fondo y el
  sitio web), en su totalidad y sin partes reservadas.
- El sistema desplegado y funcionando en producción.
- La migración completa del catálogo: 1.269 productos, 102 categorías y 1.826
  imágenes.
- La documentación técnica: modelo de precios e IVA, guiones de prueba,
  documentación automática de la API.
- La configuración de publicación automática ya montada y operativa.
- Las 78 pruebas automatizadas.

### Qué NO incluye

- **Los costos recurrentes** de la sección 6 (servidor, correo, dominio). Esos
  corren aparte y son mensuales.
- **Soporte y mantenimiento continuo.** Si se quiere, se acuerda por separado.
- **Funcionalidades nuevas** que no estén en este documento.
- **Contenido:** fotos de producto adicionales, textos comerciales, descripciones.
- **Los cambios que hagan falta del lado de OrbisNet** para completar la
  integración. El lado de Construir está listo y documentado; lo que se
  programe dentro del ERP es responsabilidad de quien lo mantiene.
- **Capacitación extendida.** Se incluye una entrega guiada del panel; una
  formación formal al personal se acuerda aparte.

---

## 8. Recomendaciones a futuro

### 8.1 Urgente — el disco del servidor está al 86%

El disco del servidor tiene 19 GB útiles y hay 16 GB ocupados. Queda un 14%
libre.

Esto hay que atenderlo. Cuando un servidor Linux se queda sin disco, no avisa
con elegancia: la base de datos deja de escribir, los despliegues fallan a la
mitad y el sitio puede caerse. Las opciones son ampliar el disco (cuesta
alrededor de $0,08 por GB al mes; pasar de 20 a 40 GB serían $1,60 adicionales
mensuales) o hacer una limpieza de imágenes viejas de Docker y archivos de
registro. Lo recomendable es hacer las dos cosas.

### 8.2 El servidor compartido

Hoy funciona y sale barato, pero cinco proyectos en una máquina de 2 GB de
memoria significa que si uno de ellos se pone pesado, los demás lo sienten. No
es urgente. Sí conviene tenerlo presente: el día que Construir tenga tráfico
real y sostenido, lo sano es mudarlo a su propia máquina. El costo de esa
mudanza es lo que muestra la cifra (a) de la sección 6.1: unos $20,43 al mes.

### 8.3 Confirmar el plan de Brevo

Es el único renglón de costos que quedó sin verificar. Hay que entrar a la
cuenta, ver qué plan está activo y cuántos correos se están enviando al mes. Si
el volumen cabe en el plan gratuito (300 correos diarios), no hay nada que
pagar. Si no cabe, conviene saberlo antes de que empiecen a rebotar correos de
confirmación de pedidos.

### 8.4 Respaldos

Conviene confirmar que hay respaldo automático de la base de datos y verificar
que se pueda restaurar. Un respaldo que nunca se probó no es un respaldo.

### 8.5 Cosas que quedaron anotadas en la documentación técnica

Están descritas en `docs/pricing-iva.md`, pero vale mencionarlas acá porque son
decisiones de negocio, no solo técnicas:

- **El costo de envío está en cero.** El sistema tiene el renglón preparado pero
  no calcula flete. Cuando se defina la política de envíos, hay que decidir si
  el flete lleva IVA.
- **Dos compras simultáneas del mismo producto pueden vender más inventario del
  que hay.** Es poco probable con el volumen actual, y viene de antes de este
  trabajo, pero está identificado y se puede corregir.
- **Los pedidos viejos de prueba tienen montos calculados con la fórmula
  anterior.** Se dejaron intactos porque eran todos de prueba. Si alguien mira
  las estadísticas del mes en que se hizo el cambio, va a ver una caída de
  ingresos que no ocurrió: es un efecto del corte de versión, no una caída de
  ventas.

---

## Anexo: cómo leer las cifras de este documento

| Marca | Significado |
|---|---|
| **Verificado** | Se consultó la fuente directamente (cuenta de AWS, código, base de datos) |
| **Estimado** | Es un cálculo razonado, no una medición. Aplica a todas las horas de la sección 4 |
| **Pendiente / A confirmar** | No se pudo verificar. Aplica al plan de Brevo y al costo del dominio |

Ninguna cifra de este documento fue inventada. Las de AWS salen de la consola
de facturación de la cuenta; las de código, del conteo directo sobre los dos
repositorios; las de catálogo, de la base de datos. Las horas son
estimaciones y están marcadas como tales.

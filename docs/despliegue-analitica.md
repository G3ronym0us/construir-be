# Analítica de visitas: pasos de despliegue y política de retención

La tabla `page_views` dejó de recoger la IP y el navegador del visitante, y pasó
a guardar el referrer recortado a su origen. Este documento recoge lo que **no**
hacen las migraciones por sí solas y hay que hacer al desplegar.

## 1. Orden de despliegue: primero el frontend

`CreatePageViewDto` ya no declara `userAgent`, y la validación global corre con
`forbidNonWhitelisted`. Un cliente que siga mandando ese campo recibe un **400**,
y el registro de visitas **falla en silencio** (`services/analytics.ts` traga el
error a propósito, para que la analítica no rompa la navegación).

Consecuencia: si se despliega el backend primero, cada navegador con el bundle
viejo en caché deja de contar sus visitas hasta que recargue, y nadie se entera.

**Despliega el frontend antes que el backend.**

## 2. `yarn analitica:limpiar-rastro` — obligatorio, no opcional

```bash
yarn migration:run
yarn analitica:limpiar-rastro    # <- este paso NO se puede saltar
```

**Sin este paso la rama no consigue su objetivo.** Las migraciones borran las
columnas con `DROP COLUMN`, y en Postgres eso **sólo marca el atributo como
eliminado**: los bytes de las filas ya escritas siguen en el fichero de datos. No
se pueden leer por SQL, pero sí en un respaldo físico o en un snapshot.

Está medido, no supuesto. Restaurando el respaldo real en una base limpia y
aplicando las dos migraciones, leyendo el fichero con `pg_read_binary_file`:

| Rastro | A nivel SQL | En el fichero de datos | Tras el comando |
|---|---|---|---|
| Token de invitación en `referrer` | 0 filas | **legible** | no |
| IP del visitante | columna borrada | **legible** | no |
| `user_agent` (`Mozilla…`) | columna borrada | **legible** | no |

Es decir: una migración pensada para eliminar una credencial filtrada y datos
personales los deja los tres legibles byte a byte si falta este paso.

El comando ejecuta `VACUUM FULL page_views`, comprueba antes y después que el
rastro ya no está, y **sale con código de error si algo sigue ahí**, para que un
despliegue automatizado se entere. Antes esto vivía sólo como un comentario en el
código y se omitió dos veces; por eso ahora es un comando.

**Qué protege y qué no.** `VACUUM FULL` reescribe la tabla en un fichero nuevo y
desenlaza el viejo; no sobrescribe los bloques del dispositivo. Es decir: protege
frente a quien lea la base o se lleve un respaldo lógico, que es el escenario
real aquí, pero no frente a un análisis forense del disco. Para eso la respuesta
es el cifrado en reposo, no este comando.

**Límite conocido:** el comando lee el fichero de datos por segmentos y en trozos
de 16 MB, así que funciona con tablas por encima de 1 GB. Si aun así fallara la
lectura, **aborta con error en vez de dar un "limpio"**: nunca afirma estar
limpio sin haberlo medido.

`VACUUM FULL` reescribe la tabla entera y la bloquea mientras dura, así que
conviene una ventana de poco tráfico (con los tamaños de esta tabla son
segundos). No puede ir dentro de una migración porque no corre en transacción y
el modo transaccional de este proyecto es `all`.

También se midió que un `UPDATE ... SET NULL` previo al `DROP` **no** borra esos
bytes —siguen en el heap con y sin él— y a cambio duplica el tamaño en disco y
alarga el bloqueo de la migración. Por eso no está.

## 3. Política de retención

`page_views` se purga sola: un cron diario a las 3:30 (hora de Caracas) borra las
visitas más antiguas que el plazo configurado.

| Variable | Defecto | Qué hace |
|---|---|---|
| `ANALYTICS_PAGE_VIEW_RETENTION_DAYS` | `180` | Días que se conservan las visitas. |
| `ANALYTICS_PAGE_VIEW_PURGE_BATCH_LIMIT` | `50000` | Tope de filas borradas por ejecución. |

**El plazo es una decisión del dueño de la tienda**, no del código: 180 días
cubren de sobra lo único que se consulta (totales del día y del mes, ranking de
páginas) sin acumular historial a perpetuidad.

Reglas de las que conviene estar al tanto:

- El valor debe ser **un entero positivo y nada más**. `1e9`, `1_000` o `1 año`
  se rechazan enteros. Antes se leían con `parseInt`, que se queda con el prefijo
  y convertía los tres en `1`: la purga borraba todo lo anterior a un día e
  informaba de éxito.
- Un valor que no se entienda **no cae al defecto**: no se purga nada y queda un
  aviso en el log. Es deliberado — una tabla que crece es un problema visible y
  reversible; un borrado no se deshace.
- Si una ejecución llena el lote, lo dice en el log y el resto se borra al día
  siguiente.

## 4. Límite de tasa: `trust proxy`

`POST /analytics/page-view` es público y limita a 240 peticiones por minuto y por
visitante, contando por la primera entrada de `x-forwarded-for`
(`VisitanteThrottlerGuard`).

Se hace así porque `main.ts` **no** configura `app.set('trust proxy', …)`, y el
guard de serie de `@nestjs/throttler` usa `req.ip`, que sin esa opción es la IP
del proxy para todo el mundo: la tienda entera compartía un solo cubo y quedaba
limitada al techo de una sola persona.

Dos cosas a tener presentes:

- **Si algún día se activa `trust proxy` globalmente**, este guard sigue siendo
  correcto, pero conviene revisar si ya no hace falta.
- **El almacén del throttler es el de memoria.** Con más de una instancia de la
  aplicación el límite efectivo se multiplica por el número de instancias. Si se
  escala horizontalmente, hace falta un almacén compartido.
- La cabecera `x-forwarded-for` la puede falsificar quien llegue directo al
  backend sin pasar por el proxy. Esto acota el abuso accidental y el ruido, no a
  un atacante decidido; para eso el proxy debe reescribir la cabecera y el
  backend no debe ser alcanzable por otra vía.

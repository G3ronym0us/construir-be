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

## 2. `VACUUM FULL page_views` — obligatorio, no opcional

Las migraciones borran las columnas con `DROP COLUMN`. En Postgres eso **sólo
marca el atributo como eliminado**: los bytes de las filas ya escritas siguen en
el fichero de datos. No se pueden leer por SQL, pero sí en un respaldo físico o
con acceso al disco.

Se midió: tras `DROP COLUMN "userAgent"`, las cadenas `Mozilla` seguían legibles
en el fichero de la tabla. También se midió que un `UPDATE ... SET NULL` previo
al `DROP` **no** los borra —siguen en el heap con y sin él— y a cambio duplica el
tamaño en disco y alarga el bloqueo de la migración. Por eso no está.

Lo único que los borra es:

```sql
VACUUM FULL page_views;
```

No puede ir dentro de la migración (no corre en una transacción, y el modo
transaccional de este proyecto es `all`). **Ejecútalo a mano justo después de
`yarn migration:run`**, en una ventana de poco tráfico: reescribe la tabla entera
y la bloquea mientras dura.

Comprobación de que quedó limpio (sustituye la cadena por lo que buscas):

```sql
SELECT count(*) FROM page_views;   -- las filas siguen ahí
```

```bash
# Ninguna coincidencia = los bytes ya no están en el fichero de datos.
psql -tAc "SELECT pg_relation_filepath('page_views')" construir_db
grep -c "Mozilla" "$PGDATA/<ruta que devuelva la consulta anterior>"
```

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

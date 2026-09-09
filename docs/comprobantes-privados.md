# Comprobantes de pago privados

## Qué pasaba

Los comprobantes que suben los clientes al pagar —capturas de transferencias y
pagos móviles, con nombre y apellido, cédula, banco, número de cuenta y número
de teléfono— se subían al mismo bucket de S3 que las imágenes de producto, con
el mismo método, y su URL directa se guardaba en `payment_info.receipt_url` y
salía dentro de cualquier respuesta que devolviera la orden.

Ese bucket sirve las imágenes de la tienda, así que tiene lectura anónima. Un
`GET` a una de esas URL **sin ninguna credencial** devuelve el documento:

```
$ curl -s -o /dev/null -w "%{http_code} %{content_type}\n" \
    https://congress-marketing.s3.us-east-2.amazonaws.com/receipts/<uuid>.png
200 image/png
```

Además, `POST /orders/:uuid/receipt` no pedía autenticación de ningún tipo, no
tenía límite de tasa ni de tamaño, y decidía si el archivo era una imagen mirando
el `Content-Type` que manda el propio cliente —que encima daba la extensión con
la que se guardaba el objeto—. Con acertar un uuid de orden se podía escribir
cualquier cosa en el bucket de producción.

## Qué arregla el código

- `S3Service` ya no tiene un `uploadFile` neutro: hay `uploadPublicFile` (URL
  directa, para productos, categorías y banners) y `uploadPrivateFile` (sólo
  devuelve la `key`, y la guarda bajo el prefijo `private/`).
- Los comprobantes nuevos van a `private/receipts/<uuid>.<ext>` y su URL pública
  no se escribe nunca más en la base.
- Para verlos hay `GET /orders/:uuid/receipt`, con sesión, que devuelve una URL
  firmada que caduca a los 5 minutos. La pueden pedir los `admin`, los
  `order_admin` y el cliente registrado dueño de la orden.
- La subida sigue sin pedir sesión (el checkout de invitado la necesita así),
  pero con 5 intentos por minuto y por IP, 5 MB de tope, comprobación de que la
  orden existe, no está cancelada y no tiene el pago ya verificado, y detección
  del tipo por los bytes del fichero.
- La migración `DropPublicReceiptUrls` borra de la base las URL públicas ya
  guardadas.

## Lo que el código NO puede arreglar — hay que hacerlo a mano en AWS

**Los comprobantes que ya están subidos siguen en el bucket, bajo `receipts/`, y
siguen respondiendo 200 a cualquiera que tenga la URL.** Son 9 objetos (los que
tienen `receipt_key` en `payment_info`). Borrar la URL de la base no los cierra:
quien la haya copiado alguna vez la sigue teniendo.

Hay que hacer dos cosas en la consola de AWS, con la cuenta dueña del bucket
`congress-marketing` (región `us-east-2`).

### 1. Quitar la lectura anónima de todo lo que no sea imagen de la tienda

Hoy la policy del bucket casi con seguridad concede `s3:GetObject` a
`Principal: "*"` sobre `arn:aws:s3:::congress-marketing/*`, es decir, sobre
**todo**. Hay que reducir ese permiso a los prefijos que de verdad tienen que ser
públicos.

> ### Dos avisos antes de tocar nada
>
> **NO pegues un JSON entero encima de la policy.** Puede haber más sentencias de
> las que tratamos aquí, y sustituir el documento completo las borraría todas. Lo
> único que hay que cambiar es el campo `Resource` de UNA sentencia.
>
> **NO añadas una sentencia `Deny` con `"Principal": "*"`.** Es la salida que
> parece más natural y es la peor: un `Deny` así también le pega al usuario IAM
> del backend, las URL firmadas dejarían de funcionar y el admin no vería ningún
> comprobante. En AWS un `Deny` explícito gana siempre, incluso sobre los
> permisos del propio dueño. Lo correcto es recortar el `Allow`.

1. Consola de AWS → **S3** → bucket `congress-marketing` → pestaña
   **Permissions** → **Bucket policy** → **Edit**.
2. Copiar la policy actual a un archivo aparte, por si hay que volver atrás.
3. Buscar la sentencia que tiene `"Principal": "*"` y `"Action": "s3:GetObject"`.
   Dentro de **esa sentencia y sólo esa**, el campo `Resource` dirá algo como:

   ```json
   "Resource": "arn:aws:s3:::congress-marketing/*"
   ```

   Hay que **sustituir ese campo, y sólo ese**, por esta lista:

   ```json
   "Resource": [
     "arn:aws:s3:::congress-marketing/categories/*",
     "arn:aws:s3:::congress-marketing/banners/*",
     "arn:aws:s3:::congress-marketing/products/*"
   ]
   ```

   `products/*` va en la lista porque es donde el backend sube las imágenes de
   producto nuevas, aunque hoy el bucket todavía no tenga ninguna (ver el aviso
   del paso 4).

4. **Guardar y comprobar** desde una terminal cualquiera, sin credenciales. Hay
   que usar objetos que existan de verdad: **S3 responde 403 y no 404 a un objeto
   que no existe** cuando quien pregunta no tiene permiso de `ListBucket`, así
   que probar con una ruta inventada da un 403 que parece un fallo del cambio y
   no lo es.

   **Ojo: no sirve probar con `products/`.** A día de hoy el bucket **no tiene ni
   un objeto bajo `products/`** — todas las imágenes de producto se sirven desde
   `public/uploads` del servidor, no desde S3. Un `curl` a `products/loquesea`
   devuelve 403 antes y después del cambio. Hay que probar con `categories/` o
   `banners/`, que sí tienen contenido.

   Las dos primeras consultas devuelven la URL completa, ya lista para pegar en
   el `curl`; la tercera devuelve sólo la clave, que va detrás del dominio:

   ```sql
   SELECT image FROM categories WHERE image ILIKE '%amazonaws%' LIMIT 1;
   SELECT images->'desktop'->>'jpeg' FROM banners LIMIT 1;
   SELECT receipt_key FROM payment_info WHERE receipt_key IS NOT NULL LIMIT 1;
   ```

   Y entonces:

   ```bash
   # Una imagen de categoría: TIENE que seguir dando 200
   curl -s -o /dev/null -w "categoria %{http_code}\n" '<url de la 1a consulta>'

   # Un banner: TIENE que seguir dando 200
   curl -s -o /dev/null -w "banner    %{http_code}\n" '<url de la 2a consulta>'

   # Un comprobante viejo: TIENE que pasar de 200 a 403
   curl -s -o /dev/null -w "recibo    %{http_code}\n" \
     'https://congress-marketing.s3.us-east-2.amazonaws.com/<receipt_key>'
   ```

   Lo que se espera: `categoria 200`, `banner 200`, `recibo 403`. Si la categoría
   o el banner pasan a 403, ahí sí se rompió algo: hay que volver a poner la
   policy guardada en el paso 2 y revisar los prefijos.

5. Por último, comprobar que el admin sigue viendo los comprobantes en el panel
   (detalle de una orden que tenga uno). Eso pasa por la URL firmada, que es lo
   que confirma que el recorte del `Allow` no se llevó por delante al usuario IAM
   del backend.

### 2. Mover los comprobantes viejos bajo `private/`

Con el paso 1 los comprobantes ya no son públicos, así que esto es opcional; sirve
para que todo lo privado quede junto bajo un solo prefijo y la policy sea más
fácil de mantener. Desde una terminal con el AWS CLI configurado con la cuenta
del bucket:

Los objetos a mover son los que la base lista en `payment_info.receipt_key` (la
columna `receipt_url` está a NULL después de la migración, así que no sirve para
localizarlos):

```bash
# Ver primero qué hay, sin mover nada
aws s3 ls s3://congress-marketing/receipts/ --recursive

# Mover (copia y borra el original)
aws s3 mv s3://congress-marketing/receipts/ \
          s3://congress-marketing/private/receipts/ --recursive
```

Si se hace esto, hay que actualizar las claves en la base **en la misma sesión**,
o el admin dejará de ver los 9 comprobantes antiguos:

```sql
UPDATE payment_info
SET receipt_key = 'private/' || receipt_key
WHERE receipt_key LIKE 'receipts/%';
```

Si no se hace, no pasa nada: el backend firma igual una clave que empiece por
`receipts/`, y los comprobantes nuevos ya nacen bajo `private/`.

### 3. Comprobar que ya no hay nada público que no deba estarlo

```bash
aws s3api get-bucket-policy --bucket congress-marketing \
  --query Policy --output text | python3 -m json.tool
```

Debe listar únicamente los prefijos de imágenes de la tienda.

### Lo que conviene asumir

Las URL de esos 9 comprobantes estuvieron abiertas a Internet durante todo el
tiempo que llevan subidas. No hay forma de saber desde el repositorio si alguien
las llegó a pedir; eso sólo lo dirían los *access logs* del bucket, si estaban
activados (S3 → bucket → **Properties** → **Server access logging**). Si no lo
estaban, conviene activarlos ahora, aunque sea para la próxima vez.

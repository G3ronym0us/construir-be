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
tienen `receipt_url` en `payment_info`). Borrar la URL de la base no los cierra:
quien la haya copiado alguna vez la sigue teniendo.

Hay que hacer dos cosas en la consola de AWS, con la cuenta dueña del bucket
`congress-marketing` (región `us-east-2`).

### 1. Quitar la lectura anónima de todo lo que no sea imagen de la tienda

Hoy la policy del bucket casi con seguridad concede `s3:GetObject` a
`Principal: "*"` sobre `arn:aws:s3:::congress-marketing/*`, es decir, sobre
**todo**. Hay que reducir ese permiso a los prefijos que de verdad tienen que ser
públicos.

1. Consola de AWS → **S3** → bucket `congress-marketing` → pestaña
   **Permissions** → **Bucket policy** → **Edit**.
2. Copiar la policy actual a un archivo aparte, por si hay que volver atrás.
3. En la sentencia que tiene `"Principal": "*"` y `"Action": "s3:GetObject"`,
   sustituir el `Resource` por la lista de prefijos públicos:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LecturaPublicaSoloImagenesDeLaTienda",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::congress-marketing/products/*",
        "arn:aws:s3:::congress-marketing/categories/*",
        "arn:aws:s3:::congress-marketing/banners/*"
      ]
    }
  ]
}
```

   Si la policy tiene además otras sentencias (por ejemplo de otra aplicación que
   use el mismo bucket), hay que dejarlas como están y tocar sólo ésa.

4. **Guardar y comprobar** desde una terminal cualquiera, sin credenciales:

```bash
# Un comprobante viejo: TIENE que dar 403
curl -s -o /dev/null -w "%{http_code}\n" \
  https://congress-marketing.s3.us-east-2.amazonaws.com/receipts/<uuid>.png

# Una imagen de producto: TIENE que seguir dando 200
curl -s -o /dev/null -w "%{http_code}\n" \
  https://congress-marketing.s3.us-east-2.amazonaws.com/products/<uuid>.jpg
```

   Si la imagen de producto empieza a dar 403, la tienda se queda sin fotos: hay
   que revisar que los tres prefijos de arriba sean de verdad los que usa la
   aplicación (`products/`, `categories/`, `banners/`) antes de dar el cambio por
   bueno.

**Importante: no añadir una sentencia `Deny` con `"Principal": "*"`.** Un `Deny`
así también le pega al usuario IAM del backend, y entonces las URL firmadas
dejarían de funcionar y el admin no vería ningún comprobante. Lo correcto es
recortar el `Allow`, como arriba.

### 2. Mover los comprobantes viejos bajo `private/`

Con el paso 1 los comprobantes ya no son públicos, así que esto es opcional; sirve
para que todo lo privado quede junto bajo un solo prefijo y la policy sea más
fácil de mantener. Desde una terminal con el AWS CLI configurado con la cuenta
del bucket:

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

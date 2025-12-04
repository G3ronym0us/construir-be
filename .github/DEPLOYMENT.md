# 🚀 Despliegue Automático con GitHub Actions

Este proyecto usa GitHub Actions para desplegar automáticamente a producción cada vez que se hace push a la rama `main`.

## 📋 Configuración de Secrets

Antes de que el despliegue automático funcione, necesitas configurar los siguientes secrets en GitHub:

### 1. Ir a la configuración de Secrets

1. Ve a tu repositorio en GitHub: https://github.com/G3ronym0us/construir-be
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Secrets and variables** → **Actions**
4. Click en **New repository secret**

### 2. Agregar los siguientes secrets:

| Secret Name | Descripción | Ejemplo |
|-------------|-------------|---------|
| `SSH_HOST` | IP o hostname del servidor | `54.123.45.67` |
| `SSH_USER` | Usuario SSH del servidor | `ubuntu` |
| `SSH_PRIVATE_KEY` | Contenido del archivo .pem | (ver abajo) |
| `SSH_PORT` | Puerto SSH (opcional, default: 22) | `22` |

### 3. Obtener la llave privada desde el archivo .pem

En tu máquina local:

```bash
# Ver el contenido del archivo .pem
cat /ruta/a/tu/archivo.pem
```

Copia **TODO** el contenido del archivo .pem, incluyendo:
```
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

**Pégalo completo** en el secret `SSH_PRIVATE_KEY`.

⚠️ **IMPORTANTE**:
- Copia TODO el contenido del archivo .pem tal como está
- No modifiques ni agregues espacios
- Incluye las líneas de BEGIN y END

### 4. Verificar configuración del servidor

En el servidor, asegúrate de que:

1. El usuario puede ejecutar comandos de Docker sin sudo:
   ```bash
   sudo usermod -aG docker ubuntu
   # Luego cierra sesión y vuelve a entrar
   ```

2. El repositorio está clonado en `~/construir-be`

3. Docker y docker-compose están instalados

## 🔄 Proceso de Despliegue Automático

Cada vez que hagas `git push origin main`, GitHub Actions automáticamente:

1. ✅ Se conecta al servidor por SSH usando la llave .pem
2. ✅ Hace pull de los últimos cambios
3. ✅ Detiene el contenedor actual
4. ✅ Construye la nueva imagen de Docker
5. ✅ Inicia el nuevo contenedor
6. ✅ Muestra los últimos logs

## 📊 Ver el estado del despliegue

1. Ve a la pestaña **Actions** en GitHub: https://github.com/G3ronym0us/construir-be/actions
2. Verás el historial de todos los despliegues
3. Click en cualquier ejecución para ver los detalles y logs

## 🔍 Troubleshooting

### El despliegue falla con error de SSH

- Verifica que `SSH_HOST` sea la IP correcta del servidor
- Verifica que `SSH_USER` sea `ubuntu` (o el usuario correcto)
- Asegúrate de que `SSH_PRIVATE_KEY` contenga TODO el contenido del archivo .pem
- Verifica que el puerto SSH sea 22 (default)

### El despliegue falla en la construcción de Docker

- Revisa los logs en la pestaña Actions
- Puede ser un error en el código que necesita ser corregido

### Despliegue manual de emergencia

Si necesitas desplegar manualmente:

```bash
# Desde tu máquina local
ssh -i /ruta/a/tu/archivo.pem ubuntu@IP_DEL_SERVIDOR

# En el servidor
cd ~/construir-be
git pull origin main
docker stop construir-be && docker rm construir-be
docker-compose build app
docker-compose up -d app
docker logs -f construir-be
```

## 🛡️ Seguridad

- ✅ Los secrets están encriptados en GitHub
- ✅ Solo las acciones de GitHub pueden acceder a ellos
- ✅ La llave .pem nunca se expone en los logs
- ⚠️ **NUNCA** commitees el archivo .pem al repositorio
- ✅ El archivo .pem debe estar en tu `.gitignore`

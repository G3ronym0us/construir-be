# Sistema de Tipos de Cambio y Precios Duales (USD/VES)

## Resumen

Este sistema permite mantener precios en dólares (USD) mientras se muestran también en bolívares venezolanos (VES), con actualización automática diaria del tipo de cambio desde la API del BCV.

## Características Implementadas

### 1. **Entidad ExchangeRate**
- Almacena el historial de tipos de cambio por fecha
- Campos: `id`, `date`, `rate`, `source`, `createdAt`, `updatedAt`
- Índice único en `date` para evitar duplicados

### 2. **Servicio BCV**
- Consulta automática a `https://ve.dolarapi.com/v1/dolares/oficial`
- Caché de 5 minutos para evitar llamadas excesivas
- Manejo de errores con fallback al caché

### 3. **Job/Cron Diario**
- Ejecuta automáticamente a la **1:00 AM** (hora de Venezuela)
- Obtiene el tipo de cambio desde la API de BCV
- Actualiza el campo `priceVes` de TODOS los productos
- **Lógica automática de "arrastre"**:
  - Fines de semana y feriados: usa el último tipo de cambio disponible
  - No requiere configuración manual de días feriados

### 4. **Campos Nuevos en Entidades**

#### **Product**
- `priceVes` (decimal): Precio en bolívares, actualizado automáticamente

#### **Order**
- `exchangeRate` (decimal): Tipo de cambio del día
- `subtotalVes` (decimal): Subtotal en bolívares
- `totalVes` (decimal): Total en bolívares

#### **OrderItem**
- `priceVes` (decimal): Precio unitario en bolívares
- `subtotalVes` (decimal): Subtotal del item en bolívares

#### **Cart / CartItem**
- Propiedades computadas `subtotalVes` que calculan dinámicamente los precios en VES

### 5. **Endpoints API**

#### **GET /exchange-rates**
Listar historial de tipos de cambio (paginado)
```bash
GET /exchange-rates?page=1&limit=10
```
**Autenticación:** Requerida (JWT)

#### **GET /exchange-rates/current**
Obtener el tipo de cambio vigente (hoy o el más reciente)
```bash
GET /exchange-rates/current
```
**Autenticación:** No requerida

#### **POST /exchange-rates/sync**
Forzar sincronización inmediata con BCV
```bash
POST /exchange-rates/sync
```
**Autenticación:** Requerida (JWT)

## Instalación e Inicialización

### 1. Instalar Dependencias
```bash
yarn install
```

### 2. Inicializar el Sistema
Ejecutar el script de inicialización para:
- Obtener el tipo de cambio actual desde BCV
- Guardar en la base de datos
- Actualizar precios VES de todos los productos

```bash
yarn init-exchange-rate
```

**Salida esperada:**
```
🚀 Initializing exchange rate system...

📊 Checking for existing exchange rates...
  Found 0 existing exchange rate(s)

💱 Fetching current exchange rate from BCV...
  ✅ Exchange rate synchronized: 45.25 VES/USD
  📅 Date: 2025-11-21
  📡 Source: bcv

📦 Updating VES prices for 150 product(s)...
  ✅ All product prices updated successfully!

✨ Exchange rate initialization completed successfully!

💡 The system will automatically update prices daily at 1:00 AM
💡 You can also manually sync with: POST /exchange-rates/sync
```

### 3. Iniciar la Aplicación
```bash
yarn start:dev
```

## Uso del Sistema

### **Consultar Productos**
Los productos ahora incluyen automáticamente ambos precios:
```json
{
  "id": 1,
  "name": "Cemento Portland",
  "price": 10.50,
  "priceVes": 475.13,
  ...
}
```

### **Consultar Carrito**
El carrito calcula automáticamente subtotales en ambas monedas:
```json
{
  "id": 1,
  "subtotal": 52.50,
  "subtotalVes": 2375.63,
  "items": [
    {
      "quantity": 5,
      "price": 10.50,
      "subtotal": 52.50,
      "subtotalVes": 2375.63,
      "product": {
        "name": "Cemento Portland",
        "price": 10.50,
        "priceVes": 475.13
      }
    }
  ]
}
```

### **Crear Orden**
Las órdenes capturan y almacenan el tipo de cambio del día:
```json
{
  "id": 123,
  "orderNumber": "ORD-ABC123",
  "subtotal": 52.50,
  "total": 52.50,
  "exchangeRate": 45.25,
  "subtotalVes": 2375.63,
  "totalVes": 2375.63,
  "items": [
    {
      "productName": "Cemento Portland",
      "price": 10.50,
      "priceVes": 475.13,
      "quantity": 5,
      "subtotal": 52.50,
      "subtotalVes": 2375.63
    }
  ]
}
```

## Actualización Manual del Tipo de Cambio

Si necesitas actualizar el tipo de cambio inmediatamente (sin esperar al job nocturno):

### **Opción 1: Via API**
```bash
curl -X POST http://localhost:3000/exchange-rates/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Opción 2: Volver a ejecutar el script**
```bash
yarn init-exchange-rate
```

## Lógica de Días No Hábiles

El sistema maneja automáticamente fines de semana y feriados:

- **Lunes a Viernes**: El job se ejecuta a la 1:00 AM y actualiza el tipo de cambio
- **Sábados y Domingos**: El job no actualiza, los productos mantienen el precio del viernes
- **Lunes temprano (antes de la 1:00 AM)**: Los productos siguen usando el tipo de cambio del viernes
- **Feriados**: Se comportan como fines de semana, "arrastrando" el último valor disponible

Esta lógica es automática y no requiere mantenimiento de una tabla de feriados.

## Precios Históricos en Órdenes

Las órdenes capturan y congelan:
- Tipo de cambio del día (`exchangeRate`)
- Precios en USD y VES de cada producto
- Subtotales y totales en ambas monedas

Esto asegura que las órdenes históricas no se vean afectadas por cambios posteriores en el tipo de cambio.

## Zona Horaria

El cron job usa la zona horaria de Venezuela (`America/Caracas`) para asegurar que se ejecute a la 1:00 AM hora local.

## Monitoreo

### **Ver logs del job**
Los logs del job nocturno aparecen en la consola de la aplicación:
```
[ExchangeRateTasksService] Starting daily exchange rate synchronization...
[ExchangeRateTasksService] Exchange rate synchronized: 45.25
[ExchangeRateTasksService] Updating VES prices for 150 products...
[ExchangeRateTasksService] Daily exchange rate synchronization completed successfully
```

### **Verificar último tipo de cambio**
```bash
curl http://localhost:3000/exchange-rates/current
```

## Troubleshooting

### **El tipo de cambio no se actualiza**
1. Verificar que la aplicación esté corriendo a la 1:00 AM
2. Revisar los logs para ver si hay errores
3. Probar manualmente: `POST /exchange-rates/sync`
4. Verificar conectividad con `https://ve.dolarapi.com/v1/dolares/oficial`

### **Productos sin precio VES**
Ejecutar:
```bash
yarn init-exchange-rate
```

### **Órdenes antiguas sin precios VES**
Esto es normal. Solo las órdenes creadas después de la implementación incluirán precios VES. Las órdenes antiguas mantendrán solo precios USD.

## Arquitectura

```
┌─────────────────┐
│   BCV API       │
│ dolarapi.com    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  BCVService     │ (caché 5 min)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ExchangeRates    │
│   Service       │
└────────┬────────┘
         │
         ├────────────────────┐
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│  Cron Job       │  │  API Endpoints  │
│  (1:00 AM)      │  │  /exchange-rates│
└────────┬────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Update Products │
│   priceVes      │
└─────────────────┘
```

## Base de Datos

### **Nueva tabla: exchange_rates**
```sql
CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  source VARCHAR(50) DEFAULT 'bcv',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Campos agregados a products**
```sql
ALTER TABLE products ADD COLUMN price_ves DECIMAL(10,2) NULL;
```

### **Campos agregados a orders**
```sql
ALTER TABLE orders
  ADD COLUMN exchange_rate DECIMAL(10,2) NULL,
  ADD COLUMN subtotal_ves DECIMAL(10,2) NULL,
  ADD COLUMN total_ves DECIMAL(10,2) NULL;
```

### **Campos agregados a order_items**
```sql
ALTER TABLE order_items
  ADD COLUMN price_ves DECIMAL(10,2) NULL,
  ADD COLUMN subtotal_ves DECIMAL(10,2) NULL;
```

**Nota:** Con `synchronize: true` en TypeORM, estas migraciones se aplican automáticamente.

## Soporte

Para problemas o preguntas sobre el sistema de tipos de cambio, contactar al equipo de desarrollo.

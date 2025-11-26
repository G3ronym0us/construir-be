# Integración Frontend - Sistema de Precios Duales USD/VES

## Resumen de Cambios en el Backend

El backend ahora soporta precios duales en dólares (USD) y bolívares (VES). Todos los endpoints de productos, carrito y órdenes ahora incluyen automáticamente ambos precios.

---

## 🔄 Cambios en las Respuestas de la API

### 1. **Productos** (`GET /products`)

#### ✅ ANTES:
```json
{
  "id": 1,
  "name": "Cemento Portland",
  "sku": "CEM-001",
  "price": 10.50,
  "inventory": 100,
  "description": "...",
  "images": [...]
}
```

#### ✨ AHORA:
```json
{
  "id": 1,
  "name": "Cemento Portland",
  "sku": "CEM-001",
  "price": 10.50,
  "priceVes": 475.13,    // ⬅️ NUEVO
  "inventory": 100,
  "description": "...",
  "images": [...]
}
```

**Nota:** `priceVes` puede ser `null` si no hay tipo de cambio disponible.

---

### 2. **Carrito** (`GET /cart`)

#### ✅ ANTES:
```json
{
  "id": 5,
  "totalItems": 3,
  "subtotal": 52.50,
  "items": [
    {
      "id": 10,
      "quantity": 5,
      "price": 10.50,
      "subtotal": 52.50,
      "product": {
        "name": "Cemento Portland",
        "price": 10.50
      }
    }
  ]
}
```

#### ✨ AHORA:
```json
{
  "id": 5,
  "totalItems": 3,
  "subtotal": 52.50,
  "subtotalVes": 2375.63,    // ⬅️ NUEVO (computed)
  "items": [
    {
      "id": 10,
      "quantity": 5,
      "price": 10.50,
      "subtotal": 52.50,
      "subtotalVes": 2375.63,  // ⬅️ NUEVO (computed)
      "product": {
        "name": "Cemento Portland",
        "price": 10.50,
        "priceVes": 475.13    // ⬅️ NUEVO
      }
    }
  ]
}
```

**Nota:** `subtotalVes` se calcula en tiempo real basándose en `priceVes` del producto.

---

### 3. **Órdenes** (`GET /orders/:id` o `POST /orders`)

#### ✅ ANTES:
```json
{
  "id": 123,
  "orderNumber": "ORD-ABC123",
  "status": "pending",
  "subtotal": 52.50,
  "tax": 0,
  "shipping": 0,
  "discountAmount": 0,
  "total": 52.50,
  "items": [
    {
      "productName": "Cemento Portland",
      "productSku": "CEM-001",
      "quantity": 5,
      "price": 10.50,
      "subtotal": 52.50
    }
  ]
}
```

#### ✨ AHORA:
```json
{
  "id": 123,
  "orderNumber": "ORD-ABC123",
  "status": "pending",
  "subtotal": 52.50,
  "tax": 0,
  "shipping": 0,
  "discountAmount": 0,
  "total": 52.50,
  "exchangeRate": 45.25,      // ⬅️ NUEVO (tipo de cambio usado)
  "subtotalVes": 2375.63,     // ⬅️ NUEVO
  "totalVes": 2375.63,        // ⬅️ NUEVO
  "items": [
    {
      "productName": "Cemento Portland",
      "productSku": "CEM-001",
      "quantity": 5,
      "price": 10.50,
      "subtotal": 52.50,
      "priceVes": 475.13,       // ⬅️ NUEVO
      "subtotalVes": 2375.63    // ⬅️ NUEVO
    }
  ]
}
```

**Importante:** Los precios VES en órdenes son **históricos** y no cambiarán aunque el tipo de cambio se actualice.

---

## 📡 Nuevos Endpoints

### 1. **Obtener Tipo de Cambio Actual**

```http
GET /exchange-rates/current
```

**Respuesta:**
```json
{
  "id": 5,
  "date": "2025-11-21T00:00:00.000Z",
  "rate": 45.25,
  "source": "bcv",
  "createdAt": "2025-11-21T05:00:00.000Z",
  "updatedAt": "2025-11-21T05:00:00.000Z"
}
```

**Autenticación:** No requerida

**Casos de uso:**
- Mostrar el tipo de cambio en el footer/header
- Mostrar la fecha de última actualización
- Mostrar información de conversión al usuario

---

### 2. **Historial de Tipos de Cambio** (Admin)

```http
GET /exchange-rates?page=1&limit=10
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": 5,
      "date": "2025-11-21",
      "rate": 45.25,
      "source": "bcv",
      "createdAt": "2025-11-21T05:00:00.000Z",
      "updatedAt": "2025-11-21T05:00:00.000Z"
    },
    {
      "id": 4,
      "date": "2025-11-20",
      "rate": 45.18,
      "source": "bcv",
      "createdAt": "2025-11-20T05:00:00.000Z",
      "updatedAt": "2025-11-20T05:00:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

**Autenticación:** Requerida (JWT - solo admins)

---

### 3. **Sincronizar Tipo de Cambio Manualmente** (Admin)

```http
POST /exchange-rates/sync
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Respuesta:**
```json
{
  "id": 6,
  "date": "2025-11-21T00:00:00.000Z",
  "rate": 45.30,
  "source": "bcv",
  "createdAt": "2025-11-21T15:30:00.000Z",
  "updatedAt": "2025-11-21T15:30:00.000Z"
}
```

**Autenticación:** Requerida (JWT - solo admins)

**Nota:** Este endpoint también actualiza automáticamente los precios VES de todos los productos.

---

## 🎨 Recomendaciones de UI/UX

### **1. Mostrar Ambos Precios en Productos**

```jsx
// Componente de Producto
<div className="product-card">
  <h3>{product.name}</h3>
  <div className="price-container">
    <span className="price-usd">${product.price.toFixed(2)} USD</span>
    {product.priceVes && (
      <span className="price-ves">Bs. {product.priceVes.toFixed(2)}</span>
    )}
  </div>
</div>
```

**Variantes de diseño:**
- **Opción A:** Precio USD principal, VES secundario (más pequeño)
- **Opción B:** Ambos precios del mismo tamaño
- **Opción C:** Toggle para cambiar entre USD y VES

---

### **2. Resumen de Carrito Dual**

```jsx
// Componente de Resumen de Carrito
<div className="cart-summary">
  <div className="subtotal-row">
    <span>Subtotal USD:</span>
    <span>${cart.subtotal.toFixed(2)}</span>
  </div>
  {cart.subtotalVes && (
    <div className="subtotal-row secondary">
      <span>Subtotal VES:</span>
      <span>Bs. {cart.subtotalVes.toFixed(2)}</span>
    </div>
  )}
</div>
```

---

### **3. Información del Tipo de Cambio**

```jsx
// Componente de Footer o Header
const ExchangeRateInfo = () => {
  const [rate, setRate] = useState(null);

  useEffect(() => {
    fetch('/exchange-rates/current')
      .then(res => res.json())
      .then(data => setRate(data));
  }, []);

  if (!rate) return null;

  return (
    <div className="exchange-rate-info">
      <span>Tasa del día: 1 USD = {rate.rate} VES</span>
      <span className="date">
        Actualizado: {new Date(rate.updatedAt).toLocaleDateString()}
      </span>
    </div>
  );
};
```

---

### **4. Detalles de Orden con Precios Históricos**

```jsx
// Componente de Detalle de Orden
<div className="order-details">
  <div className="order-header">
    <h2>Orden #{order.orderNumber}</h2>
    {order.exchangeRate && (
      <p className="exchange-info">
        Tipo de cambio aplicado: 1 USD = {order.exchangeRate} VES
      </p>
    )}
  </div>

  <div className="order-totals">
    <div className="total-row">
      <span>Total USD:</span>
      <span>${order.total.toFixed(2)}</span>
    </div>
    {order.totalVes && (
      <div className="total-row">
        <span>Total VES:</span>
        <span>Bs. {order.totalVes.toFixed(2)}</span>
      </div>
    )}
  </div>
</div>
```

---

## ⚠️ Consideraciones Importantes

### **1. Manejo de Valores `null`**

Los campos `priceVes`, `subtotalVes`, y `totalVes` pueden ser `null` en las siguientes situaciones:
- No hay tipo de cambio disponible en el sistema (primera vez)
- Órdenes creadas antes de implementar el sistema
- Errores temporales al obtener el tipo de cambio

**Siempre valida antes de mostrar:**

```javascript
// ✅ CORRECTO
{product.priceVes ? (
  <span>Bs. {product.priceVes.toFixed(2)}</span>
) : (
  <span>Precio en VES no disponible</span>
)}

// ❌ INCORRECTO (puede causar error)
<span>Bs. {product.priceVes.toFixed(2)}</span>
```

---

### **2. Formato de Números**

Usa siempre `.toFixed(2)` para mostrar precios:

```javascript
// Correcto
const priceFormatted = product.price.toFixed(2); // "10.50"

// También puedes usar Intl.NumberFormat
const formatter = new Intl.NumberFormat('es-VE', {
  style: 'currency',
  currency: 'VES',
  minimumFractionDigits: 2
});

formatter.format(product.priceVes); // "Bs. 475,13"
```

---

### **3. Actualización en Tiempo Real**

Los precios VES en productos y carrito se actualizan:
- **Automáticamente:** Cada día a la 1:00 AM
- **Manualmente:** Cuando un admin ejecuta `POST /exchange-rates/sync`

Si necesitas que el frontend detecte cambios:

```javascript
// Polling periódico (cada 5 minutos)
useEffect(() => {
  const interval = setInterval(() => {
    fetchCart(); // Recargar carrito
    fetchProducts(); // Recargar productos
  }, 5 * 60 * 1000);

  return () => clearInterval(interval);
}, []);
```

**Nota:** En producción, considera usar WebSockets o Server-Sent Events para actualizaciones en tiempo real.

---

### **4. Conversión Manual (Opcional)**

Si quieres calcular precios VES manualmente en el frontend:

```javascript
const calculateVES = async (usdAmount) => {
  const response = await fetch('/exchange-rates/current');
  const { rate } = await response.json();
  return (usdAmount * rate).toFixed(2);
};

// Uso
const totalVES = await calculateVES(cart.subtotal);
```

**⚠️ Advertencia:** Preferible usar los valores que vienen del backend para evitar inconsistencias.

---

## 🧪 Testing

### **Casos de Prueba para el Frontend**

1. **Producto con precio VES:**
   - Verificar que se muestren ambos precios
   - Verificar formato correcto (2 decimales)

2. **Producto sin precio VES (null):**
   - Verificar que no cause error
   - Mostrar mensaje apropiado o solo precio USD

3. **Carrito con precios VES:**
   - Verificar cálculo correcto de subtotales
   - Verificar suma correcta por item

4. **Orden histórica:**
   - Verificar que muestre el tipo de cambio usado
   - Verificar que los precios VES no cambien

5. **Sin tipo de cambio disponible:**
   - Verificar manejo graceful
   - No debe romper la UI

---

## 📱 Ejemplo Completo: Página de Producto

```jsx
import React, { useState, useEffect } from 'react';

const ProductCard = ({ product }) => {
  return (
    <div className="product-card">
      <img src={product.images[0]?.url} alt={product.name} />

      <h3>{product.name}</h3>
      <p>{product.description}</p>

      <div className="price-section">
        <div className="price-main">
          <span className="currency">USD</span>
          <span className="amount">${product.price.toFixed(2)}</span>
        </div>

        {product.priceVes && (
          <div className="price-secondary">
            <span className="currency">VES</span>
            <span className="amount">Bs. {product.priceVes.toFixed(2)}</span>
          </div>
        )}
      </div>

      <button
        onClick={() => addToCart(product.id)}
        disabled={product.inventory === 0}
      >
        {product.inventory > 0 ? 'Agregar al Carrito' : 'Sin Stock'}
      </button>

      <p className="stock-info">
        Disponibles: {product.inventory} unidades
      </p>
    </div>
  );
};

export default ProductCard;
```

---

## 🎯 Resumen de Acciones Requeridas en el Frontend

1. ✅ **Actualizar interfaces/types** de TypeScript para incluir campos VES
2. ✅ **Mostrar ambos precios** en todas las vistas de productos
3. ✅ **Validar valores null** antes de renderizar precios VES
4. ✅ **Actualizar resumen de carrito** para mostrar subtotales en VES
5. ✅ **Actualizar detalles de orden** para mostrar precios históricos VES
6. ✅ **Agregar componente informativo** del tipo de cambio (opcional pero recomendado)
7. ✅ **Panel admin:** agregar gestión de tipos de cambio (opcional)

---

## 🔗 Recursos Adicionales

- **Documentación completa del sistema:** Ver `EXCHANGE_RATE_SYSTEM.md`
- **API de tipos de cambio:** `GET /exchange-rates/current`
- **Testing manual:** Usar Postman/Insomnia para probar endpoints

---

## 🆘 Soporte

Si encuentras algún problema o inconsistencia en los datos:
1. Verificar que el tipo de cambio está inicializado (`GET /exchange-rates/current`)
2. Verificar que los productos tienen `priceVes` no nulo
3. Contactar al equipo de backend si hay datos faltantes

# Pantallas de la sesión del cliente — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development
> (recomendado) o superpowers:executing-plans para implementar tarea por tarea.
> Los pasos usan casillas (`- [ ]`) para seguimiento.

**Objetivo:** llevar al front las nueve pantallas del handoff
`Constru-ir Sesion Cliente.dc.html`, con las tres desviaciones que aprobó el
spec, más el endpoint y el campo que el backend necesita para alimentarlas.

**Arquitectura:** casi todo ocurre en `construir-fe`. Se agrega una carpeta
`src/components/session/` con las cuatro piezas reutilizables, y las páginas
existentes se recomponen encima. En `construir-be` hay una sola tarea: exponer
la metadata del enlace de reset y la fecha de la tasa en el seguimiento.

**Stack:** Next.js (App Router, `"use client"`), TypeScript, Tailwind con los
tokens de `globals.css`, next-intl para toda la copia, Vitest + Testing Library
para las pruebas. En el backend, NestJS + Jest.

**Spec:** `docs/superpowers/specs/2026-07-31-sesion-cliente-design.md`
**Handoff visual:** `construir-fe/docs/design/sesion-cliente.dc.html` — ábrelo
en el navegador para ver la pantalla que estés implementando. Cada `<figure>`
tiene `data-screen-label` con su número.

## Global Constraints

- **Dos repos.** Las rutas que empiezan por `src/auth/`, `src/orders/` son de
  `construir-be`. Todo lo demás es `construir-fe`. Cada tarea dice cuál.
- **Toda la copia va en `messages/es.json` y `messages/en.json`.** No se
  hardcodea texto visible en JSX. Las dos locales se actualizan en el mismo
  commit; una clave que exista sólo en `es` rompe la build en inglés.
- **Sólo tokens de `globals.css`.** `sand-*`, `brand-*`, `accent-*`,
  `success-*`, `danger-*`, `ink`. Nunca `gray-*`, `blue-*`, `slate-*`,
  `green-*`, `red-*`: las ocho páginas afectadas hoy tienen cero clases legacy
  y así deben quedar. El handoff usa hex crudos — su equivalencia es:
  `#0f2842`→`brand-900`, `#0f4c81`→`brand-600`, `#e2851b`→`accent-500`,
  `#a85f0d`→`accent-700`, `#fdf1e2`→`accent-100`, `#1a7a55`→`success-600`,
  `#eaf5ef`→`success-50`, `#fbfaf8`→`sand-50`, `#f7f5f2`→`sand-100`,
  `#f0ede8`→`sand-200`, `#e7e3dd`→`sand-300`, `#ded9d2`→`sand-400`,
  `#b6b1a9`→`sand-500`, `#8b8781`→`sand-600`, `#55524d`→`sand-700`,
  `#14181d`→`ink`. Los rojos del handoff (`#c1443f`, `#d9534f`, `#fdf0f0`,
  `#f2d3d2`) se sustituyen por `danger-500`, `danger-50` y `danger-100`.
- **En las pruebas, next-intl está mockeado y `t(clave)` devuelve la clave
  tal cual** (`src/test/mocks/next-intl.ts`, enganchado por alias en
  `vitest.config.ts`). Es decir: el componente que llama `t('preparing')`
  renderiza el texto literal `preparing`, **no** «En preparación». Y el mock
  ignora los parámetros: `t('waiting', { seconds: '0:42' })` renderiza
  `waiting`, sin interpolar.

  De ahí dos reglas: **afirma sobre la clave, nunca sobre el texto en
  español**, y **una aserción negativa sobre texto traducido no prueba nada**
  — `expect(queryByText(/rastreo/i)).toBeNull()` pasa siempre, porque esa
  palabra nunca aparece en el DOM de una prueba. Para comprobar que algo no se
  muestra, afirma sobre datos reales (un número de referencia, un monto), que
  sí llegan sin traducir.
- **Toques de 44 px como mínimo:** todo elemento interactivo lleva `min-h-11`.
- **Titulares en `font-display` (Archivo), texto en la fuente por defecto
  (Manrope).** El handoff lo marca con `font:700 …'Archivo'`.
- **El bolívar es el monto protagonista y el dólar la referencia**, en ese
  orden y con esa jerarquía visual, igual que en los correos. Se formatean con
  `formatVES` y `formatUSD` de `src/lib/currency.ts`; no se crea otra utilidad
  ni se llama a `toLocaleString` suelto.
- **Nunca inventar estados.** Los del backend son `on-hold`, `pending`,
  `completed`, `cancelled`. El tipo `OrderStatus` del front es más ancho e
  incluye `shipped`, `delivered`, `processing` y otros que **el backend nunca
  emite**: son residuo. No construir nada sobre ellos.
- **Prohibido el «número de rastreo».** No existe. Si aparece una clave
  `tracking.trackingNumber` o un campo `trackingNumber`, no se usa.
- Commits en español, en imperativo, con el prefijo convencional.

---

### Task 1: Backend — metadata del enlace de reset y fecha de la tasa

**Repo:** `construir-be`

**Files:**
- Modify: `src/users/users.service.ts` (junto a `confirmPasswordReset:409`)
- Modify: `src/auth/auth.controller.ts`
- Modify: `src/orders/dto/order-tracking.dto.ts`
- Test: `src/users/users.service.resetTokenInfo.spec.ts` (crear)

**Interfaces:**
- Produces: `UsersService.getResetTokenInfo(token)` → `{ email, expiresAt }`
- Produces: `GET /auth/reset-password/:token` → `{ email: string; expiresAt: string }`
  con el correo enmascarado. 404 si el token no existe, ya se usó o venció.
- Produces: `OrderTrackingDto.exchangeRateDate: string | null`

**Contexto:** `User` ya tiene `passwordResetToken` y `passwordResetExpiresAt`
(`src/users/user.entity.ts:105` y `:121`).

**El método va en `UsersService`, no en `AuthService`.** `AuthService` sólo
recibe `(usersService, jwtService)` y no tiene repositorio; toda la lógica del
reset ya vive en `UsersService`, que es quien posee `usersRepository`. El
controlador de auth llama directo al servicio de usuarios — mira
`auth.controller.ts:38-41`, que es exactamente el patrón a seguir.

Reutiliza la guarda de `confirmPasswordReset` (`users.service.ts:417-422`), que
ya comprueba token, expiración y nulos: la lógica de validez tiene que ser la
misma o las dos pantallas discreparán sobre si un enlace sirve.

- [ ] **Paso 1: escribir la prueba que falla**

Crear `src/users/users.service.resetTokenInfo.spec.ts`.

`UsersService` tiene varias dependencias además del repositorio de `User`
(repositorios de invitaciones, `EmailService`, `ConfigService`…). **Antes de
escribir el `beforeEach`, abre el constructor de `src/users/users.service.ts` y
declara un doble por cada parámetro**; los que este método no usa pueden ser
`{}`. Si ya existe otro `*.spec.ts` de `UsersService` en el repo, copia su
armado en vez de inventar uno.

```ts
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './user.entity';

describe('UsersService.getResetTokenInfo', () => {
  let service: UsersService;
  const repo = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        // …más un proveedor por cada dependencia restante del constructor.
      ],
    }).compile();
    service = mod.get(UsersService);
  });

  it('enmascara el correo del dueño del token', async () => {
    repo.findOne.mockResolvedValue({
      email: 'jose@correo.com',
      passwordResetExpiresAt: new Date('2026-07-31T18:47:00Z'),
    });

    const info = await service.getResetTokenInfo('tok-valido');

    expect(info.email).toBe('jo•••@correo.com');
    // El correo completo no puede viajar: el endpoint es público y un token
    // filtrado se volvería un oráculo de direcciones.
    expect(info.email).not.toContain('se@');
  });

  it('devuelve la expiración en ISO', async () => {
    repo.findOne.mockResolvedValue({
      email: 'jose@correo.com',
      passwordResetExpiresAt: new Date('2026-07-31T18:47:00Z'),
    });

    const info = await service.getResetTokenInfo('tok-valido');

    expect(info.expiresAt).toBe('2026-07-31T18:47:00.000Z');
  });

  it('rechaza un token que no existe', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.getResetTokenInfo('inventado')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza un token vencido con el mismo error que uno inexistente', async () => {
    repo.findOne.mockResolvedValue({
      email: 'jose@correo.com',
      passwordResetExpiresAt: new Date(Date.now() - 60_000),
    });
    // Mismo 404 a propósito: distinguir "venció" de "no existe" sólo le sirve
    // a quien esté probando tokens.
    await expect(service.getResetTokenInfo('vencido')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('enmascara correos de parte local corta sin revelarla entera', async () => {
    repo.findOne.mockResolvedValue({
      email: 'ab@correo.com',
      passwordResetExpiresAt: new Date(Date.now() + 60_000),
    });

    const info = await service.getResetTokenInfo('tok');

    expect(info.email).toBe('a•••@correo.com');
  });
});
```

- [ ] **Paso 2: correr la prueba y ver que falla**

`yarn test -- --testPathPattern=resetTokenInfo`
Esperado: FAIL — `service.getResetTokenInfo is not a function`.

- [ ] **Paso 3: implementar**

En `src/users/users.service.ts`, justo encima de `confirmPasswordReset`:

```ts
/**
 * Datos mínimos del enlace de recuperación, para que la pantalla de nueva
 * contraseña muestre de quién es y cuánto le queda.
 *
 * El correo va enmascarado: el endpoint es público y sin sesión, así que
 * devolver la dirección completa convertiría un token filtrado en un oráculo
 * de correos. Con la primera letra basta para que el dueño se reconozca.
 */
async getResetTokenInfo(
  token: string,
): Promise<{ email: string; expiresAt: string }> {
  const user = await this.usersRepository.findOne({
    where: { passwordResetToken: token },
  });

  const expiresAt = user?.passwordResetExpiresAt;
  if (!user || !expiresAt || expiresAt.getTime() <= Date.now()) {
    // Mismo error para inexistente, usado y vencido: la diferencia sólo le
    // sirve a quien esté probando tokens.
    throw new NotFoundException('El enlace no es válido o ya venció');
  }

  return { email: maskEmail(user.email), expiresAt: expiresAt.toISOString() };
}
```

Y arriba del archivo, fuera de la clase:

```ts
/** `jose@correo.com` → `jo•••@correo.com`. Deja como mucho dos caracteres. */
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '•••';
  const visible = Math.min(2, at - 1) || 1;
  return `${email.slice(0, visible)}•••${email.slice(at)}`;
}
```

Cuidado con `NotFoundException`: `users.service.ts` importa hoy
`BadRequestException` de `@nestjs/common`. Agrega el import que falta.

- [ ] **Paso 4: correr la prueba y ver que pasa**

`yarn test -- --testPathPattern=resetTokenInfo` → PASS (5 pruebas).

- [ ] **Paso 5: exponer el endpoint**

En `src/auth/auth.controller.ts`, junto a `@Post('reset-password')`:

```ts
/**
 * Metadata del enlace de recuperación. Público, como el de invitación.
 */
@Get('reset-password/:token')
async getResetTokenInfo(@Param('token') token: string) {
  return this.usersService.getResetTokenInfo(token);
}
```

Añadir `Get` y `Param` a los imports de `@nestjs/common` si faltan. Ojo con el
orden de las rutas: este `@Get('reset-password/:token')` no colisiona con
`@Post('reset-password')` porque difieren en verbo, pero sí tiene que quedar
**antes** de cualquier `@Get(':algo')` genérico que se agregue después.

- [ ] **Paso 6: agregar la fecha de la tasa al seguimiento**

En `src/orders/dto/order-tracking.dto.ts`, junto a `exchangeRate`:

```ts
  exchangeRate: string | null;
  /**
   * Fecha de la tasa publicada, no la del pedido. Nula en los pedidos
   * anteriores a la migración que agregó la columna.
   */
  exchangeRateDate: string | null;
```

Y en `toOrderTrackingDto`, junto a `exchangeRate: money(order.exchangeRate)`:

```ts
    exchangeRateDate: order.exchangeRateDate ?? null,
```

- [ ] **Paso 7: verificar que no se rompió el seguimiento**

`yarn test -- --testPathPattern=orders`
Esperado: PASS. Si alguna prueba compara el objeto completo del DTO con
`toEqual`, actualízala para incluir el campo nuevo.

- [ ] **Paso 8: commit**

```bash
git add src/auth src/orders/dto/order-tracking.dto.ts
git commit -m "feat(auth): exponer los datos del enlace de recuperación

La pantalla de nueva contraseña necesita saber de quién es el enlace y
cuánto le queda. El correo va enmascarado porque el endpoint es público:
devolverlo entero volvería un token filtrado en un oráculo de direcciones.

Vencido, usado e inexistente devuelven el mismo 404 a propósito.

De paso el seguimiento expone exchangeRateDate, que ya se persiste pero no
salía, y sin el cual la tasa no puede mostrar su fecha."
```

---

### Task 2: `orderProgress` — el mapeo de estados a pasos

**Repo:** `construir-fe`

**Files:**
- Create: `src/lib/orderProgress.ts`
- Test: `src/lib/__tests__/orderProgress.test.ts`

**Interfaces:**
- Produces: `orderProgress(status, paymentStatus)` → `OrderProgressState`,
  consumido por las tareas 5, 6 y 7.

**Contexto:** esta es la única regla de negocio de la entrega y **no puede
duplicarse**: las pantallas 12 y 13 la consumen las dos. En esta misma sesión
se pagó tres veces el mismo error por duplicar la resolución del carrito en
tres archivos. Vive aquí y sólo aquí.

Los estados reales del backend son cuatro: `on-hold`, `pending`, `completed`,
`cancelled`. El tipo `OrderStatus` del front (`src/types/index.ts:544`) incluye
además `payment_review`, `confirmed`, `processing`, `shipped`, `delivered` y
`refunded`, que **el backend nunca emite**.

- [ ] **Paso 1: escribir las pruebas que fallan**

Crear `src/lib/__tests__/orderProgress.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { orderProgress } from '../orderProgress';

describe('orderProgress', () => {
  it('un pedido recién creado llega al primer paso', () => {
    expect(orderProgress('on-hold', 'pending')).toEqual({
      branch: 'normal',
      currentStep: 0,
    });
  });

  it('avanza a confirmado cuando el ERP acusa recibo', () => {
    expect(orderProgress('pending', 'pending')).toEqual({
      branch: 'normal',
      currentStep: 1,
    });
  });

  it('avanza a preparación cuando además se verificó el pago', () => {
    expect(orderProgress('pending', 'verified')).toEqual({
      branch: 'normal',
      currentStep: 2,
    });
  });

  it('llega al final cuando el pedido se completó', () => {
    expect(orderProgress('completed', 'verified')).toEqual({
      branch: 'normal',
      currentStep: 3,
    });
  });

  it('un pedido cancelado corta la secuencia en su propio ramal', () => {
    const state = orderProgress('cancelled', 'verified');
    expect(state.branch).toBe('cancelled');
    // No es un paso más de la barra: no puede quedar como "entregado".
    expect(state.currentStep).toBeLessThan(3);
  });

  it('el pago rechazado es un ramal aparte, no "por verificar"', () => {
    const state = orderProgress('pending', 'rejected');
    expect(state.branch).toBe('payment_rejected');
    // Si cayera en el camino normal, el cliente vería "verificando el pago"
    // esperando algo que ya no va a pasar.
    expect(state.branch).not.toBe('normal');
  });

  it('la cancelación pesa más que el pago rechazado', () => {
    // Un pedido cancelado con el pago rechazado está cancelado: es el estado
    // terminal y el que hay que comunicar.
    expect(orderProgress('cancelled', 'rejected').branch).toBe('cancelled');
  });

  it('no rompe con un pago ausente', () => {
    expect(orderProgress('on-hold', null)).toEqual({
      branch: 'normal',
      currentStep: 0,
    });
  });

  it('los estados que el backend nunca emite no adelantan la barra', () => {
    // "shipped" y "delivered" son residuo del tipo del front. Si algún día
    // aparecen, es un dato corrupto, no un pedido entregado.
    expect(orderProgress('shipped', 'verified').currentStep).toBe(0);
    expect(orderProgress('delivered', 'verified').currentStep).toBe(0);
  });
});
```

- [ ] **Paso 2: correr las pruebas y verlas fallar**

`yarn test -- --run orderProgress`
Esperado: FAIL — no se puede resolver `../orderProgress`.

- [ ] **Paso 3: implementar**

Crear `src/lib/orderProgress.ts`:

```ts
import type { OrderStatus, PaymentStatus } from '@/types';

/** Los cuatro pasos de la barra, en orden. */
export const PROGRESS_STEPS = [
  'received',
  'confirmed',
  'preparing',
  'delivered',
] as const;

export type ProgressStep = (typeof PROGRESS_STEPS)[number];

/**
 * Un pedido normal recorre los cuatro pasos. Cancelado y pago rechazado no son
 * pasos: son cortes de la secuencia, y se pintan distinto.
 */
export type ProgressBranch = 'normal' | 'cancelled' | 'payment_rejected';

export interface OrderProgressState {
  branch: ProgressBranch;
  /** Índice del último paso alcanzado dentro de PROGRESS_STEPS. */
  currentStep: number;
}

/**
 * Traduce el estado del pedido a la posición de la barra.
 *
 * El diseño pedía "En camino" y "Entregado" como pasos propios, pero el
 * backend no los tiene: su ciclo es on-hold → pending → completed/cancelled y
 * lo mueve el ERP con un contrato ya cerrado. La barra se mapea a lo que
 * existe en vez de inventar un avance que el cliente no puede verificar.
 *
 * El orden de las guardas importa: cancelado es terminal y manda sobre todo lo
 * demás; después el éxito; y sólo entonces el pago rechazado, que corta un
 * pedido todavía vivo.
 */
export function orderProgress(
  status: OrderStatus,
  paymentStatus: PaymentStatus | null,
): OrderProgressState {
  if (status === 'cancelled') {
    return { branch: 'cancelled', currentStep: 0 };
  }

  if (status === 'completed') {
    return { branch: 'normal', currentStep: 3 };
  }

  if (paymentStatus === 'rejected') {
    return { branch: 'payment_rejected', currentStep: 0 };
  }

  if (status === 'pending') {
    return {
      branch: 'normal',
      currentStep: paymentStatus === 'verified' ? 2 : 1,
    };
  }

  // on-hold y cualquier residuo del tipo que el backend no emite.
  return { branch: 'normal', currentStep: 0 };
}
```

- [ ] **Paso 4: correr las pruebas y verlas pasar**

`yarn test -- --run orderProgress` → PASS (9 pruebas).

- [ ] **Paso 5: commit**

```bash
git add src/lib/orderProgress.ts src/lib/__tests__/orderProgress.test.ts
git commit -m "feat(sesion): mapear el estado del pedido a los pasos de la barra

El diseño pedía 'En camino' y 'Entregado' como pasos propios, pero el
backend no los tiene. La barra se mapea a los estados que sí existen en vez
de inventar un avance que el cliente no puede verificar.

Cancelado y pago rechazado son ramales, no pasos: un pago rechazado pintado
como 'por verificar' dejaría al cliente esperando algo que no va a pasar.

Vive en un solo archivo porque lo consumen dos pantallas."
```

---

### Task 3: `OrderProgress` — el componente visual

**Repo:** `construir-fe`

**Files:**
- Create: `src/components/session/OrderProgress.tsx`
- Test: `src/components/session/__tests__/OrderProgress.test.tsx`
- Modify: `messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: `orderProgress`, `PROGRESS_STEPS` de `@/lib/orderProgress` (Task 2)
- Produces: `<OrderProgress status paymentStatus variant />` con
  `variant: 'bar' | 'timeline'`, consumido por las tareas 6 y 7.

**Contexto visual:** la variante `bar` es la tarjeta azul de la pantalla 13
(`data-screen-label="13 Seguimiento publico"`, la barra de 6 px con los cuatro
rótulos debajo). La variante `timeline` es la lista vertical con puntos y línea
de la pantalla 12. Ábrelas en `docs/design/sesion-cliente.dc.html`.

- [ ] **Paso 1: agregar la copia**

En `messages/es.json`, sección nueva `session` (y su espejo en `en.json`):

```json
"session": {
  "progress": {
    "received": "Recibido",
    "confirmed": "Confirmado",
    "preparing": "En preparación",
    "delivered": "Entregado",
    "cancelled": "Pedido cancelado",
    "cancelledHint": "Un vendedor puede ayudarte por WhatsApp.",
    "paymentRejected": "No pudimos verificar el pago",
    "paymentRejectedHint": "Escríbenos por WhatsApp para resolverlo."
  }
}
```

En `messages/en.json`:

```json
"session": {
  "progress": {
    "received": "Received",
    "confirmed": "Confirmed",
    "preparing": "Preparing",
    "delivered": "Delivered",
    "cancelled": "Order cancelled",
    "cancelledHint": "A salesperson can help you on WhatsApp.",
    "paymentRejected": "We couldn't verify the payment",
    "paymentRejectedHint": "Message us on WhatsApp to sort it out."
  }
}
```

- [ ] **Paso 2: escribir las pruebas que fallan**

Crear `src/components/session/__tests__/OrderProgress.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderProgress } from '../OrderProgress';

// Recuerda: el mock de next-intl devuelve la clave, así que los textos que
// se buscan son 'preparing', 'delivered', 'cancelled'… no su traducción.
describe('OrderProgress', () => {
  it('marca el paso alcanzado como actual para lectores de pantalla', () => {
    render(<OrderProgress status="pending" paymentStatus="verified" variant="bar" />);
    expect(screen.getByText('preparing')).toHaveAttribute('aria-current', 'step');
  });

  it('no marca como actual un paso que no se alcanzó', () => {
    render(<OrderProgress status="on-hold" paymentStatus="pending" variant="bar" />);
    expect(screen.getByText('delivered')).not.toHaveAttribute('aria-current');
  });

  it('la barra refleja el avance en su valor accesible', () => {
    render(<OrderProgress status="pending" paymentStatus="verified" variant="bar" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  });

  it('un pedido cancelado muestra el aviso en vez de la barra', () => {
    render(<OrderProgress status="cancelled" paymentStatus="verified" variant="bar" />);
    expect(screen.getByText('cancelled')).toBeInTheDocument();
    // La barra no puede seguir pintada: sugeriría que el pedido avanza.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('el pago rechazado muestra su propio aviso y no la barra', () => {
    render(<OrderProgress status="pending" paymentStatus="rejected" variant="bar" />);
    expect(screen.getByText('paymentRejected')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('la variante timeline pinta los cuatro pasos', () => {
    render(
      <OrderProgress status="pending" paymentStatus="pending" variant="timeline" />,
    );
    for (const step of ['received', 'confirmed', 'preparing', 'delivered']) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }
  });
});
```

- [ ] **Paso 3: correrlas y verlas fallar**

`yarn test -- --run OrderProgress` → FAIL, no existe el módulo.

- [ ] **Paso 4: implementar**

Crear `src/components/session/OrderProgress.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle, XCircle } from 'lucide-react';
import { orderProgress, PROGRESS_STEPS } from '@/lib/orderProgress';
import type { OrderStatus, PaymentStatus } from '@/types';

interface OrderProgressProps {
  status: OrderStatus;
  paymentStatus: PaymentStatus | null;
  /** `bar` para el seguimiento público, `timeline` para el detalle. */
  variant: 'bar' | 'timeline';
}

/**
 * El avance del pedido. Única vista del mapeo de `orderProgress`; las dos
 * pantallas que lo muestran consumen este componente en vez de repetir la
 * regla.
 */
export function OrderProgress({ status, paymentStatus, variant }: OrderProgressProps) {
  const t = useTranslations('session.progress');
  const { branch, currentStep } = orderProgress(status, paymentStatus);

  // Los ramales no son pasos: cortan la secuencia y se comunican solos.
  if (branch !== 'normal') {
    const cancelled = branch === 'cancelled';
    const Icon = cancelled ? XCircle : AlertCircle;
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-danger-100 bg-danger-50 p-4">
        <Icon className="mt-0.5 h-5 w-5 flex-none text-danger-500" aria-hidden="true" />
        <div>
          <p className="text-[13px] font-bold text-ink">
            {cancelled ? t('cancelled') : t('paymentRejected')}
          </p>
          <p className="mt-1 text-[11.5px] font-medium leading-relaxed text-sand-700">
            {cancelled ? t('cancelledHint') : t('paymentRejectedHint')}
          </p>
        </div>
      </div>
    );
  }

  const pct = ((currentStep + 1) / PROGRESS_STEPS.length) * 100;

  if (variant === 'bar') {
    return (
      <div className="flex flex-col gap-3">
        <div
          role="progressbar"
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={PROGRESS_STEPS.length}
          className="h-1.5 overflow-hidden rounded-full bg-brand-100"
        >
          <span className="block h-full bg-accent-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between">
          {PROGRESS_STEPS.map((step, i) => (
            <span
              key={step}
              aria-current={i === currentStep ? 'step' : undefined}
              className={`text-[10.5px] font-semibold ${
                i === currentStep ? 'text-ink' : 'text-brand-400'
              }`}
            >
              {t(step)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ol className="flex flex-col">
      {PROGRESS_STEPS.map((step, i) => {
        const done = i <= currentStep;
        const active = i === currentStep;
        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-none flex-col items-center">
              <span
                className={`h-3 w-3 rounded-full ${
                  active
                    ? 'bg-accent-500 ring-4 ring-accent-500/20'
                    : done
                      ? 'bg-success-600'
                      : 'border-2 border-sand-400 bg-white'
                }`}
              />
              {i < PROGRESS_STEPS.length - 1 && (
                <span
                  className={`min-h-3 w-0.5 flex-1 ${done ? 'bg-success-600' : 'bg-sand-300'}`}
                />
              )}
            </div>
            <p
              aria-current={active ? 'step' : undefined}
              className={`pb-2.5 text-[12.5px] font-bold ${
                done ? 'text-ink' : 'text-sand-600'
              }`}
            >
              {t(step)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Paso 5: correr las pruebas y verlas pasar**

`yarn test -- --run OrderProgress` → PASS (5 pruebas).

- [ ] **Paso 6: commit**

```bash
git add src/components/session messages/
git commit -m "feat(sesion): componente de avance del pedido, barra y línea de tiempo

Una sola vista del mapeo de orderProgress para las dos pantallas que lo
muestran. Los ramales de cancelado y pago rechazado reemplazan la barra en
vez de pintarse como un paso más."
```

---

### Task 4: `PasswordStrength`

**Repo:** `construir-fe`

**Files:**
- Create: `src/components/session/PasswordStrength.tsx`
- Test: `src/components/session/__tests__/PasswordStrength.test.tsx`
- Modify: `messages/es.json`, `messages/en.json`

**Interfaces:**
- Produces: `<PasswordStrength value={string} />`, consumido por la tarea 9.

**Contexto visual:** pantalla 17, las cuatro barritas de 4 px y la lista de tres
requisitos con palomita verde o círculo gris.

**Ojo:** el nivel y la lista se calculan **una sola vez**. Si el nivel sale de
un cálculo y los requisitos de otro, se desincronizan — es el error típico de
este componente.

- [ ] **Paso 1: agregar la copia**

Dentro de `session` en `messages/es.json`:

```json
"password": {
  "minLength": "Al menos 6 caracteres",
  "mixed": "Mezcla letras y números",
  "symbol": "Un símbolo la hace más fuerte",
  "strength": "Seguridad de la contraseña"
}
```

En `en.json`:

```json
"password": {
  "minLength": "At least 6 characters",
  "mixed": "Mix letters and numbers",
  "symbol": "A symbol makes it stronger",
  "strength": "Password strength"
}
```

- [ ] **Paso 2: escribir las pruebas que fallan**

Crear `src/components/session/__tests__/PasswordStrength.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrength, scorePassword } from '../PasswordStrength';

describe('scorePassword', () => {
  it('una contraseña vacía no cumple nada', () => {
    expect(scorePassword('')).toEqual({
      minLength: false,
      mixed: false,
      symbol: false,
      score: 0,
    });
  });

  it('cuenta la longitud por separado de la mezcla', () => {
    expect(scorePassword('abcdefg')).toMatchObject({
      minLength: true,
      mixed: false,
    });
  });

  it('reconoce la mezcla de letras y números', () => {
    expect(scorePassword('obra2026')).toMatchObject({
      minLength: true,
      mixed: true,
      symbol: false,
    });
  });

  it('reconoce el símbolo', () => {
    expect(scorePassword('obra2026!')).toMatchObject({ symbol: true, score: 3 });
  });

  it('el puntaje es la suma de los requisitos cumplidos', () => {
    // Blinda la sincronía: si el nivel se calculara aparte de la lista, este
    // caso se separaría del anterior sin que nada más lo note.
    const r = scorePassword('ab1!');
    expect(r.score).toBe([r.minLength, r.mixed, r.symbol].filter(Boolean).length);
  });
});

describe('PasswordStrength', () => {
  it('enciende sólo los requisitos cumplidos', () => {
    render(<PasswordStrength value="obra2026" />);
    // El mock de next-intl devuelve la clave: 'minLength', no su traducción.
    expect(screen.getByText('minLength')).toHaveAttribute('data-cumplido', 'true');
    expect(screen.getByText('symbol')).toHaveAttribute('data-cumplido', 'false');
  });

  it('lo que muestra la lista coincide con lo que dice scorePassword', () => {
    const value = 'ab1!';
    const r = scorePassword(value);
    render(<PasswordStrength value={value} />);
    for (const key of ['minLength', 'mixed', 'symbol'] as const) {
      expect(screen.getByText(key)).toHaveAttribute(
        'data-cumplido',
        String(r[key]),
      );
    }
  });
});
```

- [ ] **Paso 3: correrlas y verlas fallar**

`yarn test -- --run PasswordStrength` → FAIL.

- [ ] **Paso 4: implementar**

Crear `src/components/session/PasswordStrength.tsx`:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Check, Circle } from 'lucide-react';

export interface PasswordScore {
  minLength: boolean;
  mixed: boolean;
  symbol: boolean;
  /** Cuántos requisitos se cumplen. Siempre derivado de los tres de arriba. */
  score: number;
}

/**
 * El mínimo real lo impone el backend: 6 caracteres. Los otros dos requisitos
 * son sugerencias, no bloquean el envío.
 */
export function scorePassword(value: string): PasswordScore {
  const minLength = value.length >= 6;
  const mixed = /[a-zA-Z]/.test(value) && /\d/.test(value);
  const symbol = /[^a-zA-Z0-9]/.test(value);
  // El puntaje se deriva aquí y no se calcula en otro lado: si se separaran,
  // las barritas dirían una cosa y la lista otra.
  return {
    minLength,
    mixed,
    symbol,
    score: [minLength, mixed, symbol].filter(Boolean).length,
  };
}

export function PasswordStrength({ value }: { value: string }) {
  const t = useTranslations('session.password');
  const r = scorePassword(value);

  const requisitos = [
    { key: 'minLength' as const, label: t('minLength') },
    { key: 'mixed' as const, label: t('mixed') },
    { key: 'symbol' as const, label: t('symbol') },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5" role="img" aria-label={`${t('strength')}: ${r.score}/3`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i < r.score ? 'bg-success-600' : 'bg-sand-200'
            }`}
          />
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {requisitos.map(({ key, label }) => (
          <p
            key={key}
            data-cumplido={r[key] ? 'true' : 'false'}
            className={`flex items-center gap-2 text-[11.5px] ${
              r[key] ? 'font-semibold text-success-600' : 'font-medium text-sand-600'
            }`}
          >
            {r[key] ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Circle className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {label}
          </p>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Paso 5: correr las pruebas y verlas pasar**

`yarn test -- --run PasswordStrength` → PASS (6 pruebas).

- [ ] **Paso 6: commit**

```bash
git add src/components/session messages/
git commit -m "feat(sesion): medidor de fuerza de contraseña

El nivel se deriva de los mismos tres requisitos que muestra la lista, para
que no puedan desincronizarse. Sólo la longitud bloquea: los otros dos son
sugerencias, igual que en el backend."
```

---

### Task 5: `EmptyState` y `ResendLink`

**Repo:** `construir-fe`

**Files:**
- Create: `src/components/session/EmptyState.tsx`
- Create: `src/components/session/ResendLink.tsx`
- Test: `src/components/session/__tests__/ResendLink.test.tsx`
- Modify: `messages/es.json`, `messages/en.json`

**Interfaces:**
- Produces: `<EmptyState tone icon title description actions />` (tareas 6, 10)
- Produces: `<ResendLink email={string} />` (tarea 8)

**Contexto:** `EmptyState` cubre las tres tarjetas de la pantalla 19.
`ResendLink` es el botón «Reenviar enlace · disponible en 0:42» de la pantalla
15; consume `authService.resendVerification(email)`, que ya existe
(`src/services/auth.ts:21`) y devuelve un mensaje neutro a propósito.

- [ ] **Paso 1: agregar la copia**

Dentro de `session` en `es.json`:

```json
"resend": {
  "action": "Reenviar enlace",
  "waiting": "Reenviar enlace · disponible en {seconds}",
  "sent": "Enlace reenviado. Revisa tu correo."
}
```

En `en.json`:

```json
"resend": {
  "action": "Resend link",
  "waiting": "Resend link · available in {seconds}",
  "sent": "Link resent. Check your inbox."
}
```

- [ ] **Paso 2: escribir la prueba que falla**

Crear `src/components/session/__tests__/ResendLink.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResendLink } from '../ResendLink';
import { authService } from '@/services/auth';

vi.mock('@/services/auth', () => ({
  authService: { resendVerification: vi.fn().mockResolvedValue({ message: 'ok' }) },
}));

describe('ResendLink', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('reenvía al correo que recibe', async () => {
    const user = userEvent.setup();
    render(<ResendLink email="jose@correo.com" />);

    await user.click(screen.getByRole('button'));

    expect(authService.resendVerification).toHaveBeenCalledWith('jose@correo.com');
  });

  it('se deshabilita tras el envío para no permitir ráfagas', async () => {
    const user = userEvent.setup();
    render(<ResendLink email="jose@correo.com" />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByRole('button')).toBeDisabled());
  });

  it('sigue deshabilitado aunque el envío falle', async () => {
    vi.mocked(authService.resendVerification).mockRejectedValueOnce(new Error('red'));
    const user = userEvent.setup();
    render(<ResendLink email="jose@correo.com" />);

    await user.click(screen.getByRole('button'));

    // Si el fallo reabriera el botón, un correo lento se volvería una ráfaga
    // de reenvíos contra el relay.
    await waitFor(() => expect(screen.getByRole('button')).toBeDisabled());
  });
});
```

- [ ] **Paso 3: correrla y verla fallar**

`yarn test -- --run ResendLink` → FAIL.

- [ ] **Paso 4: implementar `ResendLink`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { authService } from '@/services/auth';

const COOLDOWN = 60;

/**
 * Reenvía el correo de verificación con una espera entre intentos.
 *
 * La espera arranca al pulsar y no se cancela si el envío falla: el backend
 * responde igual exista o no la cuenta, así que un fallo de red no distingue
 * nada y reabrir el botón sólo produciría ráfagas contra el relay.
 */
export function ResendLink({ email }: { email: string }) {
  const t = useTranslations('session.resend');
  const [left, setLeft] = useState(0);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const handle = async () => {
    setLeft(COOLDOWN);
    try {
      await authService.resendVerification(email);
      setSent(true);
    } catch {
      // Silencio deliberado: el mensaje del backend es neutro por diseño y no
      // hay nada útil que decirle al usuario más allá de esperar.
    }
  };

  const mmss = `0:${String(left).padStart(2, '0')}`;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handle}
        disabled={left > 0}
        className="flex min-h-11 w-full items-center justify-center rounded-xl border-[1.5px] border-sand-300 px-4 text-[13.5px] font-bold text-sand-700 transition-colors hover:bg-sand-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {left > 0 ? t('waiting', { seconds: mmss }) : t('action')}
      </button>
      {sent && (
        <p className="text-center text-[11.5px] font-medium text-success-600">
          {t('sent')}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Paso 5: implementar `EmptyState`**

```tsx
'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** `danger` para el fallo de carga; `neutral` para vacío y no encontrado. */
  tone?: 'neutral' | 'danger';
  children?: ReactNode;
}

/** Las tres tarjetas de estado de la pantalla 19. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = 'neutral',
  children,
}: EmptyStateProps) {
  const danger = tone === 'danger';
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl border bg-white p-6 text-center ${
        danger ? 'border-danger-100' : 'border-sand-300'
      }`}
    >
      <span
        className={`flex h-13 w-13 items-center justify-center rounded-full p-3 ${
          danger ? 'bg-danger-50 text-danger-500' : 'bg-sand-100 text-sand-600'
        }`}
      >
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-display text-base font-bold text-ink">{title}</p>
      <p className="max-w-[250px] text-[12.5px] font-medium leading-relaxed text-sand-600">
        {description}
      </p>
      {children}
    </div>
  );
}
```

- [ ] **Paso 6: correr las pruebas**

`yarn test -- --run ResendLink` → PASS (3 pruebas).

- [ ] **Paso 7: commit**

```bash
git add src/components/session messages/
git commit -m "feat(sesion): tarjetas de estado y reenvío del correo de verificación

La espera del reenvío no se cancela cuando el envío falla: el backend
responde igual exista o no la cuenta, así que reabrir el botón sólo daría
ráfagas contra el relay."
```

---

### Task 6: Pantalla 11 — confirmación de pedido

**Repo:** `construir-fe`

**Files:**
- Modify: `src/app/checkout/page.tsx:1010`
- Modify: `src/app/checkout/confirmacion/page.tsx` (reescritura)
- Modify: `src/types/index.ts` (agregar `exchangeRateDate` a `Order`)
- Test: `src/app/checkout/confirmacion/__tests__/page.test.tsx`
- Modify: `messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: `ordersService.trackOrder(orderNumber)`, `OrderProgress` (Task 3)

**Contexto:** hoy `checkout` redirige con `?method=` y nada más
(`src/app/checkout/page.tsx:1010`), así que la página no conoce el pedido. La
variable `order` de la línea 997 sí lo tiene.

Se conserva la bifurcación de Zelle —en ese método el cliente aún no pagó—
pero **sólo** en el primer paso de «¿Qué sigue?» y en el chip de estado.

Y se elimina la promesa del «número de rastreo» de las dos ramas: no existe.

- [ ] **Paso 1: pasar el pedido en la redirección**

En `src/app/checkout/page.tsx`, línea 1010:

```ts
      router.replace(
        `/checkout/confirmacion?pedido=${encodeURIComponent(order.orderNumber)}&method=${formData.paymentMethod}`,
      );
```

- [ ] **Paso 2: agregar el campo al tipo**

En `src/types/index.ts`, dentro de `interface Order`, junto a `exchangeRate`:

```ts
  exchangeRate: number | null;
  /** Fecha de la tasa publicada, no la del pedido. Nula en pedidos viejos. */
  exchangeRateDate?: string | null;
```

- [ ] **Paso 3: agregar la copia**

Dentro de `session` en `es.json`:

```json
"confirmation": {
  "title": "Pedido recibido",
  "subtitle": "Guardamos tu comprobante. Te avisamos por correo y WhatsApp cuando verifiquemos el pago.",
  "subtitleZelle": "Recibimos tu pedido. Un vendedor te escribe con los datos para pagar por Zelle.",
  "orderChip": "Pedido {number}",
  "statusPending": "Pago por verificar",
  "statusZelle": "Pendiente de contacto",
  "next": "¿Qué sigue?",
  "step1": "Verificamos tu pago",
  "step1Hint": "Hasta 24 h hábiles. Hoy está en revisión.",
  "step1Zelle": "Te pasamos los datos de Zelle",
  "step1ZelleHint": "Un vendedor te escribe para indicarte a qué cuenta pagar.",
  "step2": "Preparamos el pedido",
  "step2Hint": "Te escribimos si algún material cambia.",
  "step3": "Coordinamos la entrega",
  "step3Hint": "Un vendedor te escribe por WhatsApp para el delivery, o te avisamos cuando puedas retirar en tienda.",
  "summary": "Resumen",
  "itemsLine": "{count, plural, one {# artículo} other {# artículos}} · {method}",
  "totalPaid": "Total pagado",
  "rate": "tasa BCV {rate}",
  "accountNotice": "Creamos tu cuenta con {email}. Activa el enlace del correo para ver tus pedidos sin escribir el número.",
  "track": "Seguir mi pedido",
  "keepShopping": "Seguir comprando",
  "whatsapp": "WhatsApp",
  "degraded": "Tu pedido se creó correctamente. No pudimos cargar el resumen ahora mismo."
}
```

Traducir el espejo en `en.json` con las mismas claves.

- [ ] **Paso 4: escribir la prueba que falla**

Crear `src/app/checkout/confirmacion/__tests__/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ConfirmacionPage from '../page';
import { ordersService } from '@/services/orders';

vi.mock('@/services/orders', () => ({
  ordersService: { trackOrder: vi.fn() },
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('pedido=ORD-1042&method=pago_movil'),
}));
vi.mock('@/context/CartContext', () => ({ useCart: () => ({ clearCart: vi.fn() }) }));

const pedido = {
  orderNumber: 'ORD-1042',
  status: 'on-hold',
  deliveryMethod: 'delivery',
  paymentInfo: { status: 'pending', method: 'pago_movil' },
  items: [{ uuid: 'a', quantity: 4, productName: 'Cemento' }],
  total: 41.8,
  totalVes: 4946,
  exchangeRate: 118.32,
};

describe('Confirmación de pedido', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra el total en bolívares con el dólar de referencia', async () => {
    vi.mocked(ordersService.trackOrder).mockResolvedValue(pedido as never);
    render(<ConfirmacionPage />);

    // formatVES da "Bs. 4.946,00" y formatUSD da "$41.80" — con punto, no
    // con coma. Ver el paso 6 sobre esa diferencia con el handoff.
    expect(await screen.findByText(/4\.946,00/)).toBeInTheDocument();
    expect(screen.getByText(/41\.80/)).toBeInTheDocument();
  });

  it('conserva el número de pedido cuando el resumen no carga', async () => {
    vi.mocked(ordersService.trackOrder).mockRejectedValue(new Error('red'));
    render(<ConfirmacionPage />);

    // El pedido SÍ se creó: una confirmación que falla no puede sugerir lo
    // contrario ni dejar al cliente sin su número.
    await waitFor(() =>
      expect(screen.getByText(/ORD-1042/)).toBeInTheDocument(),
    );
  });

  it('no muestra cifras inventadas cuando el resumen no carga', async () => {
    vi.mocked(ordersService.trackOrder).mockRejectedValue(new Error('red'));
    render(<ConfirmacionPage />);

    await screen.findByText(/ORD-1042/);
    // Un total en cero sería peor que no mostrarlo: el cliente acaba de pagar.
    expect(screen.queryByText(/Bs\./)).not.toBeInTheDocument();
  });

  it('enlaza al seguimiento con el número del pedido', async () => {
    vi.mocked(ordersService.trackOrder).mockResolvedValue(pedido as never);
    render(<ConfirmacionPage />);

    await screen.findByText(/4\.946,00/);
    expect(screen.getByRole('link', { name: /track/i })).toHaveAttribute(
      'href',
      '/seguimiento/ORD-1042',
    );
  });
});
```

- [ ] **Paso 5: correrla y verla fallar**

`yarn test -- --run confirmacion` → FAIL.

- [ ] **Paso 6: reescribir la página**

Estructura, siguiendo `data-screen-label="11 Confirmacion de pedido"` del
handoff:

1. Cabecera `bg-brand-900` con las franjas diagonales (copiar el patrón de
   `AuthShell.tsx:29-36`), círculo con palomita, título, subtítulo y los dos
   chips: `Pedido {number}` en blanco y el estado en `bg-accent-500/20
   text-accent-300`.
2. Tarjeta «¿Qué sigue?» con tres pasos numerados. El primer paso bifurca por
   Zelle; los otros dos son comunes. **Tres pasos, no cuatro.**
3. Tarjeta «Resumen»: la línea de artículos y método, y el total con
   `Bs. {totalVes}` grande y `${total} · tasa BCV {rate}` debajo.
4. Aviso azul de cuenta creada, sólo si el pedido trae correo de invitado y el
   checkout registró la cuenta.
5. Botonera: «Seguir mi pedido» → `/seguimiento/{orderNumber}`, y debajo
   «Seguir comprando» → `/productos` y «WhatsApp», que **no se pinta** si no
   hay URL de WhatsApp configurada.

Mientras `loading`, esqueleto. Si `trackOrder` falla, se pinta la cabecera y
la tarjeta de pasos con el número de pedido de la URL y el aviso `degraded`,
**sin la tarjeta de resumen**. No pintarla con ceros: `formatVES(NaN)` devuelve
`Bs. 0,00` tan tranquilo, y un total en cero justo después de pagar es peor que
no mostrar nada.

Los montos salen de `formatVES` y `formatUSD` (`src/lib/currency.ts`), que ya
usa el resto de la app. **Ojo:** `formatUSD` produce `$41.80`, con punto,
mientras el handoff dibuja `$41,80` con coma. Se respeta la utilidad existente
—cambiarla afectaría a toda la app y el dólar es sólo la referencia— y la
diferencia se anota para devolvérsela a quien diseñó.

- [ ] **Paso 7: correr las pruebas y verificar**

`yarn test -- --run confirmacion` → PASS (3 pruebas).
`yarn lint` → sin errores.

- [ ] **Paso 8: commit**

```bash
git add src/app/checkout messages/ src/types/index.ts
git commit -m "feat(confirmacion): rediseñar la pantalla con el pedido real

Hasta ahora sólo leía ?method= de la URL: no conocía el pedido, así que no
podía mostrar ni número ni totales. Ahora el checkout le pasa el número y
la página lo resuelve contra el seguimiento público.

Se cae la promesa del número de rastreo, que no existe, y queda la
coordinación por WhatsApp, que es como ocurre. Si el resumen no carga, el
número sigue visible: el pedido se creó igual."
```

---

### Task 7: Pantalla 13 — seguimiento público

**Repo:** `construir-fe`

**Files:**
- Modify: `src/app/seguimiento/[orderNumber]/page.tsx` (reescritura)
- Modify: `messages/es.json`, `messages/en.json`
- Test: `src/app/seguimiento/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `OrderProgress` variante `bar` (Task 3), `EmptyState` (Task 5)

**Contexto:** la página hoy delega todo en `OrderDetail` con
`showPaymentDetails={false}`. El diseño la separa: el seguimiento público es su
propia composición, más corta, y `OrderDetail` queda para la pantalla 12.

El backend ya recorta el DTO: `paymentInfo` sólo trae `method` y `status`, y no
hay dirección. **No agregar campos que el DTO no manda.**

- [ ] **Paso 1: agregar la copia**

Dentro de `session` en `es.json`:

```json
"tracking": {
  "eyebrow": "Seguimiento",
  "order": "Pedido {number}",
  "meta": "{date} · {count, plural, one {# artículo} other {# artículos}} · {method}",
  "whatCarry": "Qué llevamos",
  "total": "Total",
  "privacy": "Esta vista pública no muestra datos de pago ni la dirección completa. Inicia sesión para verlos.",
  "deliveryTitle": "Entrega",
  "deliveryDelivery": "Delivery coordinado por WhatsApp",
  "deliveryPickup": "Retiro en tienda",
  "write": "Escribir por WhatsApp",
  "catalog": "Ver el catálogo",
  "notFound": "No encontramos ese pedido",
  "notFoundHint": "Revisa el número o inicia sesión con el correo de la compra.",
  "retry": "Reintentar",
  "login": "Ingresar"
}
```

Espejo en `en.json`.

- [ ] **Paso 2: escribir la prueba que falla**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import OrderTrackingPage from '@/app/seguimiento/[orderNumber]/page';
import { ordersService } from '@/services/orders';

vi.mock('@/services/orders', () => ({ ordersService: { trackOrder: vi.fn() } }));
vi.mock('next/navigation', () => ({ useParams: () => ({ orderNumber: 'ORD-1042' }) }));

describe('Seguimiento público', () => {
  beforeEach(() => vi.clearAllMocks());

  it('no revela datos de pago aunque vengan en la respuesta', async () => {
    vi.mocked(ordersService.trackOrder).mockResolvedValue({
      orderNumber: 'ORD-1042',
      status: 'pending',
      deliveryMethod: 'delivery',
      // El DTO recortado no manda estos campos, pero se incluyen a propósito:
      // si alguien vuelve a delegar en OrderDetail con los pagos visibles,
      // aparecerían en pantalla y esta prueba lo detecta. Son datos, no
      // traducciones, así que sí llegan literales al DOM.
      paymentInfo: {
        status: 'verified',
        method: 'pago_movil',
        referenceCode: 'REF-004592',
        cedula: 'V-12.345.678',
      },
      items: [{ uuid: 'a', productName: 'Cemento', quantity: 20 }],
      total: 41.8,
      totalVes: 4946,
      createdAt: '2026-07-28T14:24:00Z',
    } as never);

    render(<OrderTrackingPage />);

    expect(await screen.findByText('Cemento')).toBeInTheDocument();
    // La vista es pública: cualquiera con el número de pedido la abre.
    expect(screen.queryByText(/REF-004592/)).not.toBeInTheDocument();
    expect(screen.queryByText(/12\.345\.678/)).not.toBeInTheDocument();
  });

  it('muestra las cantidades de cada artículo', async () => {
    vi.mocked(ordersService.trackOrder).mockResolvedValue({
      orderNumber: 'ORD-1042',
      status: 'on-hold',
      deliveryMethod: 'pickup',
      paymentInfo: { status: 'pending', method: 'pago_movil' },
      items: [{ uuid: 'a', productName: 'Cemento', quantity: 20 }],
      total: 41.8,
      totalVes: 4946,
      createdAt: '2026-07-28T14:24:00Z',
    } as never);

    render(<OrderTrackingPage />);

    expect(await screen.findByText(/20/)).toBeInTheDocument();
  });

  it('muestra la tarjeta de no encontrado cuando el número no existe', async () => {
    vi.mocked(ordersService.trackOrder).mockRejectedValue(new Error('404'));
    render(<OrderTrackingPage />);
    // Clave, no traducción: el mock de next-intl devuelve la clave.
    expect(await screen.findByText('notFound')).toBeInTheDocument();
  });
});
```

- [ ] **Paso 3: correrla y verla fallar**

`yarn test -- --run seguimiento` → FAIL.

- [ ] **Paso 4: reescribir la página**

Siguiendo `data-screen-label="13 Seguimiento publico"`:

1. Cabecera con el logo y el botón «Ingresar» → `/login`.
2. Encabezado: eyebrow «Seguimiento», `Pedido {number}`, y la línea de meta.
3. Tarjeta `bg-brand-50 border-brand-200`: el `<OrderProgress variant="bar" />`,
   y debajo el bloque blanco de entrega con el enlace a WhatsApp.
4. Tarjeta «Qué llevamos»: nombre y `× cantidad` por ítem — **sin precios por
   línea**, sólo el total al pie en bolívares con el dólar debajo.
5. Aviso gris de privacidad con el icono de candado.
6. Botonera: WhatsApp (si hay URL) y «Ver el catálogo».

El estado de no encontrado usa `<EmptyState tone="neutral" icon={Search} />` con
«Reintentar» e «Ingresar».

Borrar del archivo el uso de `OrderDetail` y de la clave
`tracking.trackingNumber`, que queda huérfana; eliminarla también de
`messages/es.json` y `messages/en.json`.

- [ ] **Paso 5: verificar**

`yarn test -- --run seguimiento` → PASS.
Comprobar a mano en 390 px que la página no hace scroll horizontal.

- [ ] **Paso 6: commit**

```bash
git add src/app/seguimiento messages/
git commit -m "feat(seguimiento): componer la vista pública según el handoff

Deja de delegar en OrderDetail: el seguimiento público es más corto y no
muestra ni pagos ni dirección. La barra de avance sale de orderProgress, no
de estados inventados.

Se elimina la clave tracking.trackingNumber, huérfana desde que se descartó
la promesa del número de rastreo."
```

---

### Task 8: Pantalla 12 — detalle del pedido en la cuenta

**Repo:** `construir-fe`

**Files:**
- Modify: `src/components/orders/OrderDetail.tsx`
- Modify: `messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: `OrderProgress` variante `timeline` (Task 3)

**Contexto:** tras la tarea 7, `OrderDetail` ya sólo lo usa
`/mi-cuenta/ordenes/[uuid]`. Se puede simplificar: la prop
`showPaymentDetails` deja de tener un consumidor que la ponga en `false`.
**Verificarlo con `grep -rn "showPaymentDetails" src/` antes de quitarla** — si
algún admin la usa, se queda.

- [ ] **Paso 1: agregar la copia**

Dentro de `session` en `es.json`:

```json
"detail": {
  "help": "Ayuda",
  "items": "{count, plural, one {# artículo} other {# artículos}}",
  "seeAll": "Ver todos",
  "subtotalShipping": "Subtotal · envío {shipping}",
  "total": "Total",
  "payment": "Pago · {method}",
  "receipt": "Comprobante",
  "delivery": "Entrega"
}
```

Espejo en `en.json`.

- [ ] **Paso 2: insertar la línea de tiempo**

Debajo de la fila de chips de estado y antes de la tarjeta de artículos:

```tsx
<div className="rounded-2xl border border-sand-300 bg-white p-4">
  <OrderProgress
    status={order.status}
    paymentStatus={order.paymentInfo?.status ?? null}
    variant="timeline"
  />
</div>
```

- [ ] **Paso 3: ajustar las tarjetas al handoff**

Ver `data-screen-label="12 Detalle de pedido"`:

- **Artículos:** miniatura de 44 px, nombre truncado a una línea, `SKU {sku} ·
  {cantidad} × Bs. {precioVes}` debajo, y a la derecha el subtotal en bolívares
  con el dólar más pequeño.
- **Totales:** «Subtotal · envío Bs. X» en una línea, y el total en negrita con
  `${total} · tasa BCV {rate}` debajo. Si `exchangeRateDate` viene, se agrega
  «· {día} {mes}» abreviado; si es nula, se omite.
- **Pago:** título `Pago · {método}` con el chip de estado a la derecha, la
  lista de campos del método, y la fila del comprobante con el enlace.
- **Entrega:** nombre y teléfono en negrita, y la dirección en dos líneas.

- [ ] **Paso 4: verificar**

`yarn test -- --run` (toda la suite) → PASS.
`yarn build` → compila.

- [ ] **Paso 5: commit**

```bash
git add src/components/orders messages/
git commit -m "feat(pedidos): rediseñar el detalle con línea de tiempo y comprobante

La línea de tiempo sale del mismo orderProgress que la barra del
seguimiento, así que las dos pantallas no pueden discrepar sobre en qué
punto va el pedido."
```

---

### Task 9: Pantallas 15 y 16 — revisa tu correo y recuperar contraseña

**Repo:** `construir-fe`

**Files:**
- Modify: `src/app/register/page.tsx:67-96` (el bloque `success`)
- Modify: `src/app/forgot-password/page.tsx`
- Modify: `messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: `ResendLink` (Task 5)

**Contexto:** el formulario de `/register` **ya está implementado al diseño** —
`AuthShell`, los campos, el error de confirmación. **No tocarlo.** Lo único que
cambia es el bloque `success` de las líneas 67-96, que conserva el estilo viejo.

- [ ] **Paso 1: agregar la copia**

Dentro de `session` en `es.json`:

```json
"checkEmail": {
  "title": "Revisa tu correo",
  "body": "Enviamos un enlace de verificación a {email}. Ábrelo para activar tu cuenta.",
  "ifNotSeen": "Si no lo ves",
  "spam": "Revisa spam o correo no deseado.",
  "expires": "El enlace vence en 24 horas.",
  "meanwhile": "Mientras tanto puedes comprar como invitado.",
  "changeEmail": "Cambiar el correo"
},
"forgot": {
  "title": "Recuperar contraseña",
  "intro": "Escribe el correo de tu cuenta y te enviamos un enlace para crear una contraseña nueva.",
  "email": "Correo electrónico",
  "send": "Enviar enlace",
  "sentTitle": "Enlace enviado",
  "sentBody": "Si existe una cuenta con ese correo, recibirás el enlace en unos minutos. Vence en 1 hora.",
  "tip": "¿Compraste como invitado y nunca activaste la cuenta? Usa el mismo correo del pedido.",
  "backToLogin": "Volver a ingresar"
}
```

Espejo en `en.json`. Ojo con el signo de apertura `¿` en `tip`.

- [ ] **Paso 2: rehacer el bloque `success` de `/register`**

Reemplazar las líneas 67-96 por la pantalla 15: círculo verde de 64 px con el
icono de sobre, título en `font-display`, cuerpo con el correo en negrita,
tarjeta blanca «Si no lo ves» con los tres puntos, botonera con «Abrir mi
correo» (enlace `mailto:`) y el `<ResendLink email={formData.email} />`, y
abajo «Cambiar el correo», que vuelve al formulario limpiando `success`.

- [ ] **Paso 3: agregar el estado enviado a `/forgot-password`**

Tras un envío correcto se muestra la tarjeta verde `bg-success-50
border-success-100` con «Enlace enviado» y su texto. **El formulario sigue
visible**: el backend responde igual exista o no la cuenta, así que el usuario
puede corregir un correo mal escrito sin recargar.

Agregar también la tarjeta TIP (`bg-sand-100`, etiqueta ámbar «TIP») y, al pie,
«Volver a ingresar» y el enlace de WhatsApp.

- [ ] **Paso 4: verificar**

`yarn test -- --run` → PASS. `yarn lint` → limpio.

- [ ] **Paso 5: commit**

```bash
git add src/app/register src/app/forgot-password messages/
git commit -m "feat(auth): rediseñar la verificación de correo y la recuperación

El formulario de registro ya estaba al diseño; lo que faltaba era su
pantalla de éxito, que conservaba el estilo viejo y no ofrecía reenviar.

En recuperar contraseña el formulario sigue visible tras enviar: la
respuesta del backend es la misma exista o no la cuenta, así que quien
escribió mal el correo necesita poder corregirlo."
```

---

### Task 10: Pantalla 17 — nueva contraseña

**Repo:** `construir-fe`

**Files:**
- Modify: `src/services/auth.ts`
- Modify: `src/app/reset-password/page.tsx`
- Modify: `messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: `GET /auth/reset-password/:token` (Task 1), `PasswordStrength` (Task 4)

**Contexto:** la página ya maneja el token inválido (líneas 46-70). Lo que falta
es la tarjeta con el dueño del enlace y su vencimiento, y el medidor.

**No incluir la frase «al guardar cerramos la sesión en los demás
dispositivos».** El spec la descarta: los JWT son stateless y no hay revocación,
así que prometerlo es un problema de seguridad, no de copy.

- [ ] **Paso 1: agregar el método al servicio**

En `src/services/auth.ts`:

```ts
  async getResetTokenInfo(
    token: string,
  ): Promise<{ email: string; expiresAt: string }> {
    return api.get(`/auth/reset-password/${encodeURIComponent(token)}`);
  },
```

Seguir la forma exacta que usen los métodos vecinos para llamar a `api`.

- [ ] **Paso 2: agregar la copia**

```json
"reset": {
  "title": "Nueva contraseña",
  "linkValid": "Enlace válido · vence en {minutes} min",
  "newPassword": "Contraseña nueva",
  "confirm": "Confirmar contraseña",
  "save": "Guardar y entrar",
  "expiredTitle": "Si el enlace ya venció",
  "expiredBody": "Pide uno nuevo desde «¿Olvidaste tu contraseña?». Los enlaces sirven una sola vez."
}
```

Espejo en `en.json`.

- [ ] **Paso 3: pedir la metadata al montar**

```tsx
const [info, setInfo] = useState<{ email: string; expiresAt: string } | null>(null);

useEffect(() => {
  if (!token) return;
  authService
    .getResetTokenInfo(token)
    .then(setInfo)
    // Un 404 aquí no basta para bloquear la pantalla: el envío del formulario
    // vuelve a validar el token y ese error sí es definitivo. Sin metadata
    // simplemente no se pinta la tarjeta.
    .catch(() => setInfo(null));
}, [token]);
```

- [ ] **Paso 4: pintar la tarjeta y el medidor**

Cuando `info` existe, la tarjeta gris con el avatar circular de las iniciales,
el correo enmascarado y «Enlace válido · vence en N min», donde N se calcula
con `Math.max(0, Math.round((new Date(info.expiresAt).getTime() - Date.now()) / 60000))`.

Debajo del campo de contraseña nueva, `<PasswordStrength value={newPassword} />`.

Conservar el aviso rojo del pie que ya existe, con las claves `expiredTitle` y
`expiredBody`.

- [ ] **Paso 5: verificar**

`yarn test -- --run` → PASS. `yarn build` → compila.

Comprobar a mano con un enlace real: el correo tiene que verse enmascarado
(`jo•••@correo.com`), no completo.

- [ ] **Paso 6: commit**

```bash
git add src/app/reset-password src/services/auth.ts messages/
git commit -m "feat(auth): mostrar de quién es el enlace de recuperación y cuánto le queda

El correo llega enmascarado desde el backend. Se omite a propósito la frase
del diseño sobre cerrar sesión en los demás dispositivos: con JWT stateless
no ocurre, y quien cambia la contraseña porque cree que le entraron se
quedaría tranquilo sin motivo."
```

---

### Task 11: Pantalla 18 y 19 — mi cuenta y estados de la lista

**Repo:** `construir-fe`

**Files:**
- Modify: `src/app/mi-cuenta/page.tsx`
- Modify: `src/app/mi-cuenta/ordenes/page.tsx`
- Modify: `messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: `EmptyState` (Task 5)

**Contexto:** `/mi-cuenta` hoy es una página de contacto de la tienda con una
fila «Mis pedidos». El diseño la convierte en la cuenta del cliente con dos
pestañas.

**La pestaña «Direcciones» del handoff NO se implementa** — el spec la saca a
un proyecto propio. Quedan **Pedidos** y **Datos**, y la fila de pestañas se
reparte entre esas dos.

`BottomNav` ya existe (`src/components/BottomNav.tsx`): comprobar que la página
lo muestre en móvil con «Cuenta» activo, en vez de crear otra barra.

- [ ] **Paso 1: agregar la copia**

```json
"account": {
  "tabs": { "orders": "Pedidos", "data": "Datos" },
  "verified": "Verificada",
  "unverified": "Sin verificar",
  "myData": "Mis datos",
  "edit": "Editar",
  "identification": "Identificación",
  "phone": "Teléfono",
  "email": "Correo",
  "accountSection": "Cuenta",
  "changePassword": "Cambiar contraseña",
  "logout": "Cerrar sesión",
  "noOrders": "Aún no tienes pedidos",
  "noOrdersHint": "Cuando compres, aquí verás el avance de cada pedido y podrás repetirlo en un toque.",
  "seeProducts": "Ver productos",
  "loadFailed": "No pudimos cargar tus pedidos",
  "loadFailedHint": "Verifica tu conexión e intenta de nuevo.",
  "retry": "Reintentar"
}
```

Espejo en `en.json`.

- [ ] **Paso 2: recomponer `AuthenticatedView`**

Siguiendo `data-screen-label="18 Mi cuenta datos"`:

1. Cabecera: avatar circular `bg-brand-600` con las iniciales, nombre y correo,
   y el chip verde «Verificada» — que sale de `user.isEmailVerified` si el tipo
   lo trae; si no lo trae, **no se pinta el chip**, no se asume verdadero.
2. Fila de dos pestañas con subrayado `border-b-[2.5px] border-brand-600` en la
   activa. «Pedidos» navega a `/mi-cuenta/ordenes`; «Datos» es la vista actual.
3. Tarjeta «Mis datos» con Identificación, Teléfono y Correo, y «Editar» que
   lleva al formulario de perfil (`PATCH /users/profile` ya existe).
4. Tarjeta «Cuenta» con «Cambiar contraseña» y «Cerrar sesión» en rojo.
5. `ContactSection` se conserva debajo: son los datos de la tienda y siguen
   siendo útiles.

- [ ] **Paso 3: estados en la lista de pedidos**

En `src/app/mi-cuenta/ordenes/page.tsx`, sustituir el vacío y el error actuales
por `EmptyState`:

- Sin pedidos: `icon={ShoppingBag}`, `noOrders` / `noOrdersHint`, con el botón
  «Ver productos» → `/productos`.
- Fallo de carga: `tone="danger"`, `icon={AlertCircle}`, `loadFailed` /
  `loadFailedHint`, con «Reintentar» y el enlace de WhatsApp.

**«Reintentar» tiene que reintentar de verdad** — volver a llamar al servicio,
no recargar la página ni ser un enlace muerto.

- [ ] **Paso 4: verificar**

`yarn test -- --run` → PASS. `yarn build` → compila.
Revisar a mano en 390 px con sesión iniciada.

- [ ] **Paso 5: commit**

```bash
git add src/app/mi-cuenta messages/
git commit -m "feat(mi-cuenta): pestañas de pedidos y datos, y estados de la lista

Deja de ser una página de contacto de la tienda para ser la cuenta del
cliente. La pestaña de direcciones del handoff no entra: no existe la
entidad y se trabaja aparte.

El botón de reintentar vuelve a llamar al servicio en vez de recargar."
```

---

## Cierre

- [ ] `yarn test -- --run` en `construir-fe`: toda la suite en verde
- [ ] `yarn test` en `construir-be`: toda la suite en verde
- [ ] `yarn build` en `construir-fe`: compila sin errores de tipos
- [ ] `grep -rn "gray-\|blue-\|slate-\|green-\|red-" src/app/mi-cuenta src/app/checkout/confirmacion src/app/seguimiento src/app/reset-password src/app/forgot-password src/components/session` no devuelve nada
- [ ] Las claves nuevas existen en `es.json` **y** en `en.json`
- [ ] Ningún archivo menciona `trackingNumber` ni «rastreo»
- [ ] Repasar las nueve pantallas en 390 px contra `docs/design/sesion-cliente.dc.html`

## Pendientes que este plan no cubre

Anotarlos al entregar, no implementarlos:

- **Direcciones guardadas** — la tercera pestaña de la pantalla 18. Necesita su
  propio spec.
- **Revocación de sesiones** al cambiar la contraseña. Hoy no ocurre; por eso se
  quitó la frase del diseño.
- **Devolver el desvío a quien diseñó el handoff:** la pantalla 18 pierde una
  pestaña, la 13 cambia los pasos de la barra y suma el ramal de pago
  rechazado, la 17 pierde una frase, y los montos en dólares salen con punto
  decimal (`$41.80`) donde el diseño dibuja coma (`$41,80`), porque así los
  formatea el resto de la app. Va junto con las siete plantillas de correo que
  ya se habían desviado.

import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Prefijo de la API externa v1, la que consume el ERP con clave de API. */
const PREFIJO_API_EXTERNA = '/api/v1/';

/**
 * Limitador de tasa que cuenta por visitante de verdad, no por proxy.
 *
 * **El guard de serie no sirve tal como se despliega esta aplicación.** Usa
 * `req.ip`, y `req.ip` sólo refleja al cliente si Express tiene configurado
 * `trust proxy`. `main.ts` nunca lo configura, así que detrás del proxy que hay
 * en producción todas las peticiones llegan con la misma IP —la del proxy— y
 * comparten un único cubo: la tienda entera quedaba limitada al techo de una
 * sola persona.
 *
 * Que hay un proxy delante no es una suposición: el código que se quitó del
 * controlador de analítica leía `x-forwarded-for` para sacar la IP del
 * visitante.
 *
 * Se resuelve aquí y no en `main.ts` a propósito: `trust proxy` es un ajuste
 * global que cambia el comportamiento de toda la aplicación —afecta a `req.ip`,
 * a `req.protocol` y a las cookies seguras— y no debe cambiarse de refilón para
 * arreglar un límite de tasa. Aquí el alcance es exactamente el que se quiere
 * tocar.
 *
 * Se toma la primera entrada de `x-forwarded-for`, que es el cliente original;
 * las siguientes son los proxies intermedios. Ojo: quien llegue directo puede
 * falsificar esa cabecera, así que esto acota el abuso accidental y el ruido,
 * no a un atacante decidido. Para eso haría falta que el proxy la reescriba.
 *
 * ---
 *
 * **Este guard se registra como `APP_GUARD`**, así que es el que cuenta TODAS
 * las peticiones de la aplicación. Nació en el endpoint de analítica y se movió
 * acá cuando dejó de haber una sola ruta limitada: el criterio de
 * identificación del visitante tiene que ser uno solo. Antes convivían dos
 * —éste y el `req.ip` del guard de serie que usaban
 * `GET /guest-customers/search` y `POST /orders/:uuid/receipt`— y el segundo
 * estaba roto en producción por el mismo motivo de arriba: sus límites de 5 por
 * minuto los gastaba la tienda entera, no cada cliente.
 */
@Injectable()
export class VisitanteThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const reenviada = req.headers?.['x-forwarded-for'];
    const cadena = Array.isArray(reenviada) ? reenviada[0] : reenviada;
    const primera =
      typeof cadena === 'string' ? cadena.split(',')[0]?.trim() : undefined;

    return primera || req.ip || req.socket?.remoteAddress || 'desconocido';
  }

  /**
   * La API externa v1 queda fuera del límite global.
   *
   * El límite global está dimensionado para un NAVEGADOR: sale de medir lo que
   * cuesta una sesión de compra real (ver `app.module.ts`). El ERP no navega
   * —sincroniza el catálogo entero de un tirón—, así que una ráfaga legítima
   * suya supera cualquier techo pensado para una persona haciendo clic.
   * Aplicarle el mismo número sería romper la integración para defender una
   * superficie que no es la que está expuesta.
   *
   * Y no queda desprotegida: `/api/v1/*` exige clave de API (`ApiKeyGuard`), la
   * clave tiene permisos y se puede revocar, y cada petición queda registrada
   * por `ApiLoggingInterceptor` junto con la clave que la hizo. El abuso ahí es
   * atribuible y se corta revocando — justo lo que NO se puede hacer con el
   * `POST /orders` anónimo, que es el motivo de que exista el límite global.
   *
   * Se compara sobre `baseUrl + path` y nunca sobre `originalUrl`, para que el
   * resultado no dependa de la cadena de consulta.
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return false;
    }

    const req = context.switchToHttp().getRequest<{
      baseUrl?: string;
      path?: string;
      url?: string;
    }>();

    const ruta = `${req?.baseUrl ?? ''}${req?.path ?? req?.url ?? ''}`;

    return ruta.startsWith(PREFIJO_API_EXTERNA);
  }
}

import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limitador de tasa que cuenta por visitante de verdad, no por proxy.
 *
 * **El guard de serie no sirve tal como se despliega esta aplicación.** Usa
 * `req.ip`, y `req.ip` sólo refleja al cliente si Express tiene configurado
 * `trust proxy`. `main.ts` nunca lo configura, así que detrás del proxy que hay
 * en producción todas las peticiones llegan con la misma IP —la del proxy— y
 * comparten un único cubo: la tienda entera quedaba limitada al techo de una
 * sola persona, y lo que pasara de ahí se perdía con un 429 que nadie ve,
 * porque el registro de visitas falla en silencio.
 *
 * Que hay un proxy delante no es una suposición: el código que se quitó de este
 * mismo controlador leía `x-forwarded-for` para sacar la IP del visitante.
 *
 * Se resuelve aquí y no en `main.ts` a propósito: `trust proxy` es un ajuste
 * global que cambia el comportamiento de toda la aplicación —afecta a `req.ip`,
 * a `req.protocol` y a las cookies seguras— y no debe cambiarse de refilón
 * para arreglar un endpoint de analítica. Aquí el alcance es exactamente el que
 * se quiere tocar.
 *
 * Se toma la primera entrada de `x-forwarded-for`, que es el cliente original;
 * las siguientes son los proxies intermedios. Ojo: quien llegue directo puede
 * falsificar esa cabecera, así que esto acota el abuso accidental y el ruido,
 * no a un atacante decidido. Para eso haría falta que el proxy la reescriba.
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
}

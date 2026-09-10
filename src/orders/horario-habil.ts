/**
 * El reloj hábil de la tienda: cuánto tiempo de ATENCIÓN ha pasado entre dos
 * instantes.
 *
 * Existe porque el plazo que suelta el inventario de un pedido sin pagar se
 * cuenta en horas hábiles, no en horas seguidas. La promesa al cliente es
 * «verificamos tu pago en menos de dos horas hábiles», y con el reloj corrido
 * un pedido de las once de la noche se anulaba a las dos de la madrugada sin
 * que la tienda hubiera tenido ocasión de mirarlo. Medido sobre los doce
 * pedidos reales de la base, a cinco de ellos (42 %) se les agotaba la ventana
 * entera con la tienda cerrada.
 *
 * No sabe nada de pedidos ni de inventario a propósito: es aritmética de
 * calendario, y así se puede probar franja por franja con relojes falsos.
 */

/** Franja de atención de un día, en minutos desde la medianoche local. */
export interface FranjaHoraria {
  inicio: number;
  fin: number;
}

/**
 * Horario semanal. La clave es el día ISO (1 = lunes … 7 = domingo), igual que
 * `EXTRACT(ISODOW)` de Postgres, para que las mediciones en SQL y el código
 * hablen del mismo lunes.
 */
export type HorarioComercial = Map<number, FranjaHoraria[]>;

const MINUTO = 60 * 1000;

/**
 * Interpreta el horario comercial escrito en el entorno.
 *
 * **Por qué no se lee de `STORE_HOURS`.** `STORE_HOURS` es prosa para el pie de
 * los correos — «Lunes a Viernes: 8:00 AM - 5:00 PM · Sábados: …» — y ni
 * siquiera vale lo mismo en `.env` que en `.env.example`. Deducir de ahí a qué
 * hora se anulan pedidos significaría que quien retoca la redacción del pie de
 * un correo mueve, sin enterarse, el momento en que se cancelan las compras de
 * los clientes. El horario se lee de la configuración igualmente, pero de una
 * variable propia y con una gramática aburrida que o se entiende entera o no se
 * entiende nada.
 *
 * Gramática: franjas separadas por `;`, cada una `DÍAS:HH:MM-HH:MM`, donde
 * DÍAS es un día ISO (`6`) o un rango (`1-5`). Ejemplo, el horario de la
 * tienda: `1-5:08:00-17:00;6:08:00-12:00`.
 *
 * Devuelve `null` ante cualquier cosa que no se entienda entera —vacío, un
 * día fuera de 1..7, un cierre anterior a la apertura, un separador de más—.
 * No hay interpretación parcial ni caída a un horario por defecto: un horario
 * a medias haría que el reloj corriera cuando no debe, y este reloj decide
 * anulaciones de pedidos de clientes reales. Quien lo consume decide qué hacer
 * con la ausencia, y la respuesta correcta es no cancelar nada.
 */
export function parseHorarioComercial(
  texto: string | undefined,
): HorarioComercial | null {
  if (texto === undefined) return null;

  const limpio = texto.trim();
  if (limpio === '') return null;

  const horario: HorarioComercial = new Map();

  for (const bruto of limpio.split(';')) {
    const segmento = bruto.trim();
    // Un `;` de más no se ignora: es un dedazo, y ignorarlo es empezar a
    // adivinar lo que el dueño quiso escribir.
    if (segmento === '') return null;

    const m = /^([1-7])(?:-([1-7]))?:(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(
      segmento,
    );
    if (!m) return null;

    const desdeDia = Number(m[1]);
    const hastaDia = m[2] === undefined ? desdeDia : Number(m[2]);
    // Un rango al revés (`5-1`) no se "arregla" dando la vuelta a la semana:
    // no hay forma de saber si quiso decir eso o se equivocó de tecla.
    if (hastaDia < desdeDia) return null;

    const inicio = Number(m[3]) * 60 + Number(m[4]);
    const fin = Number(m[5]) * 60 + Number(m[6]);

    if (Number(m[3]) > 23 || Number(m[5]) > 24) return null;
    if (Number(m[4]) > 59 || Number(m[6]) > 59) return null;
    // Una franja vacía o al revés no abre nunca; y `24:00` sí vale como cierre
    // para poder escribir un día completo.
    if (fin <= inicio) return null;
    if (fin > 24 * 60) return null;

    for (let dia = desdeDia; dia <= hastaDia; dia++) {
      const franjas = horario.get(dia) ?? [];
      // Dos franjas del mismo día que se solapan contarían el rato compartido
      // dos veces, y el plazo real saldría más corto que el configurado.
      if (franjas.some((f) => inicio < f.fin && fin > f.inicio)) return null;
      franjas.push({ inicio, fin });
      horario.set(dia, franjas);
    }
  }

  // Un horario sin ningún día abierto detendría el reloj para siempre: ningún
  // pedido vencería jamás. Es un estado tan roto como el texto ilegible.
  return horario.size > 0 ? horario : null;
}

/**
 * Desfase de una zona IANA respecto de UTC, en milisegundos, en un instante
 * dado. Venezuela no tiene horario de verano, pero esto no lo da por supuesto:
 * la zona es configurable y el día que alguien la cambie no debe romperse.
 */
function desfaseDeZona(instante: Date, zona: string): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instante);

  const v = (tipo: string): number =>
    Number(partes.find((p) => p.type === tipo)?.value);

  const comoUtc = Date.UTC(
    v('year'),
    v('month') - 1,
    v('day'),
    // `hour12: false` rinde la medianoche como 24 en algunos entornos.
    v('hour') % 24,
    v('minute'),
    v('second'),
  );

  return comoUtc - instante.getTime();
}

/** Componentes de la fecha local en la zona de la tienda. */
interface DiaLocal {
  anio: number;
  mes: number;
  dia: number;
  /** Día ISO: 1 = lunes … 7 = domingo. */
  isoDow: number;
}

function diaLocal(instante: Date, zona: string): DiaLocal {
  const desplazado = new Date(
    instante.getTime() + desfaseDeZona(instante, zona),
  );
  // `getUTC*` sobre la fecha ya desplazada: son los componentes de pared.
  const dow = desplazado.getUTCDay();
  return {
    anio: desplazado.getUTCFullYear(),
    mes: desplazado.getUTCMonth() + 1,
    dia: desplazado.getUTCDate(),
    isoDow: dow === 0 ? 7 : dow,
  };
}

/**
 * Instante absoluto de una hora de pared concreta en la zona de la tienda.
 *
 * Dos pasadas: la primera estima el desfase con la fecha leída como si fuera
 * UTC, la segunda lo corrige con el desfase que de verdad rige en el instante
 * candidato. Sin la segunda, una hora que cae justo en un salto de horario
 * quedaría desplazada una hora.
 */
function instanteLocal(
  { anio, mes, dia }: DiaLocal,
  minutos: number,
  zona: string,
): Date {
  const aproximado = Date.UTC(anio, mes - 1, dia) + minutos * MINUTO;
  const primer = new Date(
    aproximado - desfaseDeZona(new Date(aproximado), zona),
  );
  return new Date(aproximado - desfaseDeZona(primer, zona));
}

/**
 * Minutos de atención transcurridos entre dos instantes.
 *
 * Recorre día natural a día natural en la zona de la tienda —no en la del
 * servidor— e intersecta cada franja de atención con el intervalo pedido. Ir
 * por días de pared y no sumando bloques de 24 horas es lo que hace que el
 * cambio de día caiga donde el cliente lo ve caer.
 */
export function minutosHabilesEntre(
  desde: Date,
  hasta: Date,
  horario: HorarioComercial,
  zona: string,
): number {
  if (!(hasta.getTime() > desde.getTime())) return 0;

  let acumulados = 0;
  let cursor = diaLocal(desde, zona);

  // Tope de seguridad. El recorrido termina solo, pero un horario o una zona
  // inesperados no pueden convertir esto en un bucle infinito dentro de un
  // cron: es preferible contar de menos —y por tanto no cancelar— que colgar
  // la tarea.
  for (let vueltas = 0; vueltas < 400; vueltas++) {
    const arranqueDelDia = instanteLocal(cursor, 0, zona);
    if (arranqueDelDia.getTime() >= hasta.getTime()) break;

    for (const franja of horario.get(cursor.isoDow) ?? []) {
      const abre = instanteLocal(cursor, franja.inicio, zona).getTime();
      const cierra = instanteLocal(cursor, franja.fin, zona).getTime();

      const inicio = Math.max(abre, desde.getTime());
      const fin = Math.min(cierra, hasta.getTime());
      if (fin > inicio) acumulados += (fin - inicio) / MINUTO;
    }

    // Se avanza sobre los componentes de pared, no sumando 24 h a un instante:
    // así el día siguiente es el día siguiente del calendario aunque la zona
    // cambie de desfase en medio.
    const siguiente = new Date(
      Date.UTC(cursor.anio, cursor.mes - 1, cursor.dia + 1),
    );
    cursor = {
      anio: siguiente.getUTCFullYear(),
      mes: siguiente.getUTCMonth() + 1,
      dia: siguiente.getUTCDate(),
      isoDow: siguiente.getUTCDay() === 0 ? 7 : siguiente.getUTCDay(),
    };
  }

  return acumulados;
}

/**
 * ¿Se agotó ya el plazo de `horas` HÁBILES que empezó en `desde`?
 *
 * El borde va en `>=` y no en `>`: un plazo de tres horas hábiles vence cuando
 * se han cumplido las tres, no un minuto después.
 */
export function plazoHabilAgotado(
  desde: Date,
  ahora: Date,
  horas: number,
  horario: HorarioComercial,
  zona: string,
): boolean {
  return minutosHabilesEntre(desde, ahora, horario, zona) >= horas * 60;
}

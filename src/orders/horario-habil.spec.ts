import {
  parseHorarioComercial,
  minutosHabilesEntre,
  plazoHabilAgotado,
  HorarioComercial,
} from './horario-habil';

const ZONA = 'America/Caracas';

/** El horario real de la tienda: L-V 8-17, S 8-12, domingo cerrado. */
const tienda = (): HorarioComercial =>
  parseHorarioComercial('1-5:08:00-17:00;6:08:00-12:00') as HorarioComercial;

/**
 * Instante a partir de una hora de pared de Caracas. Venezuela está en UTC-4 y
 * no tiene horario de verano, así que la conversión es una resta fija — se
 * escribe explícita y no con `new Date('...')` a secas, que interpretaría la
 * cadena en la zona del proceso y haría que las pruebas pasaran o no según la
 * máquina que las corra.
 */
const caracas = (iso: string): Date => new Date(`${iso}:00.000-04:00`);

describe('parseHorarioComercial', () => {
  it('entiende el horario de la tienda', () => {
    const h = parseHorarioComercial('1-5:08:00-17:00;6:08:00-12:00');

    expect(h).not.toBeNull();
    expect(h!.get(1)).toEqual([{ inicio: 480, fin: 1020 }]);
    expect(h!.get(5)).toEqual([{ inicio: 480, fin: 1020 }]);
    expect(h!.get(6)).toEqual([{ inicio: 480, fin: 720 }]);
    // El domingo no aparece: cerrado.
    expect(h!.get(7)).toBeUndefined();
  });

  it('admite un día suelto y varias franjas en el mismo día', () => {
    const h = parseHorarioComercial('3:08:00-12:00;3:14:00-18:00');

    expect(h!.get(3)).toEqual([
      { inicio: 480, fin: 720 },
      { inicio: 840, fin: 1080 },
    ]);
  });

  /**
   * Todo lo que no se entiende ENTERO da `null`, y quien lo consume no cancela
   * nada. No hay interpretación parcial: un horario a medias no deja el reloj
   * parado, lo deja corriendo con la tienda cerrada.
   */
  it.each([
    ['', 'vacío'],
    ['   ', 'sólo espacios'],
    ['Lunes a Viernes: 8:00 AM - 5:00 PM', 'la prosa de STORE_HOURS'],
    ['1-5:08:00-17:00;', 'un ";" de más'],
    ['0-5:08:00-17:00', 'día 0, fuera de 1..7'],
    ['1-8:08:00-17:00', 'día 8, fuera de 1..7'],
    ['5-1:08:00-17:00', 'rango de días al revés'],
    ['1-5:17:00-08:00', 'cierra antes de abrir'],
    ['1-5:08:00-08:00', 'franja vacía'],
    ['1-5:25:00-26:00', 'hora imposible'],
    ['1-5:08:70-17:00', 'minuto imposible'],
    ['1-5:8:00-17:00', 'hora sin dos dígitos'],
    ['1-5:08:00-17:00;1:10:00-12:00', 'dos franjas del lunes solapadas'],
    ['tres horas', 'texto libre'],
  ])('rechaza %p (%s)', (texto) => {
    expect(parseHorarioComercial(texto)).toBeNull();
  });

  it('rechaza la variable ausente en vez de inventarse un horario', () => {
    expect(parseHorarioComercial(undefined)).toBeNull();
  });
});

describe('minutosHabilesEntre', () => {
  it('cuenta sólo lo que cae dentro de la franja', () => {
    // Lunes de 10:00 a 12:00: dos horas, todas hábiles.
    expect(
      minutosHabilesEntre(
        caracas('2026-07-27T10:00'),
        caracas('2026-07-27T12:00'),
        tienda(),
        ZONA,
      ),
    ).toBe(120);
  });

  it('no cuenta nada con la tienda cerrada', () => {
    // Lunes de 22:00 a la 1:00 del martes: cero minutos hábiles.
    expect(
      minutosHabilesEntre(
        caracas('2026-07-27T22:00'),
        caracas('2026-07-28T01:00'),
        tienda(),
        ZONA,
      ),
    ).toBe(0);
  });

  it('corta en el cierre y retoma en la apertura del día siguiente', () => {
    // Lunes 16:00 → martes 09:00. Una hora el lunes (16-17) más una el martes
    // (8-9): dos horas hábiles de las diecisiete corridas.
    expect(
      minutosHabilesEntre(
        caracas('2026-07-27T16:00'),
        caracas('2026-07-28T09:00'),
        tienda(),
        ZONA,
      ),
    ).toBe(120);
  });

  it('salta el domingo entero', () => {
    // Sábado 11:00 → lunes 09:00. Una hora el sábado (11-12), cero el domingo,
    // una el lunes (8-9).
    expect(
      minutosHabilesEntre(
        caracas('2026-08-01T11:00'),
        caracas('2026-08-03T09:00'),
        tienda(),
        ZONA,
      ),
    ).toBe(120);
  });

  it('suma varias semanas sin perder ni inventar días', () => {
    // Lunes 08:00 → lunes 08:00 de la semana siguiente: cinco días de nueve
    // horas más el sábado de cuatro.
    expect(
      minutosHabilesEntre(
        caracas('2026-07-27T08:00'),
        caracas('2026-08-03T08:00'),
        tienda(),
        ZONA,
      ),
    ).toBe((5 * 9 + 4) * 60);
  });

  it('un intervalo invertido o nulo no cuenta nada', () => {
    expect(
      minutosHabilesEntre(
        caracas('2026-07-27T12:00'),
        caracas('2026-07-27T10:00'),
        tienda(),
        ZONA,
      ),
    ).toBe(0);
    expect(
      minutosHabilesEntre(
        caracas('2026-07-27T10:00'),
        caracas('2026-07-27T10:00'),
        tienda(),
        ZONA,
      ),
    ).toBe(0);
  });

  describe('los bordes del horario', () => {
    it('el minuto de la apertura ya cuenta', () => {
      expect(
        minutosHabilesEntre(
          caracas('2026-07-27T07:59'),
          caracas('2026-07-27T08:01'),
          tienda(),
          ZONA,
        ),
      ).toBe(1);
    });

    it('el minuto del cierre ya no cuenta', () => {
      expect(
        minutosHabilesEntre(
          caracas('2026-07-27T16:59'),
          caracas('2026-07-27T17:01'),
          tienda(),
          ZONA,
        ),
      ).toBe(1);
    });

    it('un intervalo entero anterior a la apertura vale cero', () => {
      expect(
        minutosHabilesEntre(
          caracas('2026-07-27T06:00'),
          caracas('2026-07-27T08:00'),
          tienda(),
          ZONA,
        ),
      ).toBe(0);
    });
  });

  /**
   * La zona es la de la tienda, no la del proceso. Si el reloj leyera la hora
   * de pared del servidor, un despliegue en UTC correría las franjas cuatro
   * horas: las 8 de Caracas serían las 12, y un pedido de las 8 de la mañana
   * no empezaría a contar hasta mediodía.
   */
  it('cuenta en la zona de la tienda y no en UTC', () => {
    const desde = caracas('2026-07-27T08:00');
    const hasta = caracas('2026-07-27T11:00');

    expect(minutosHabilesEntre(desde, hasta, tienda(), ZONA)).toBe(180);
    // Las mismas 12:00-15:00 UTC, leídas como si la tienda estuviera en
    // Londres, sí caen dentro de su horario pero son otro tramo: lo que fija
    // esta prueba es que el resultado DEPENDE de la zona que se le pasa.
    expect(
      minutosHabilesEntre(
        caracas('2026-07-27T04:00'),
        caracas('2026-07-27T07:00'),
        tienda(),
        ZONA,
      ),
    ).toBe(0);
    expect(
      minutosHabilesEntre(
        caracas('2026-07-27T04:00'),
        caracas('2026-07-27T07:00'),
        tienda(),
        'Europe/London',
      ),
    ).toBe(180);
  });
});

describe('plazoHabilAgotado', () => {
  /** El caso que el dueño puso como ejemplo. */
  it('un pedido del viernes a las 16:00 no vence esa noche', () => {
    const pedido = caracas('2026-07-31T16:00');

    expect(
      plazoHabilAgotado(pedido, caracas('2026-07-31T23:00'), 3, tienda(), ZONA),
    ).toBe(false);
    expect(
      plazoHabilAgotado(pedido, caracas('2026-08-01T03:00'), 3, tienda(), ZONA),
    ).toBe(false);
  });

  it('ese mismo pedido vence el sábado a las 10:00', () => {
    const pedido = caracas('2026-07-31T16:00');

    // Una hora el viernes (16-17) + dos el sábado (8-10) = tres hábiles.
    expect(
      plazoHabilAgotado(pedido, caracas('2026-08-01T09:59'), 3, tienda(), ZONA),
    ).toBe(false);
    expect(
      plazoHabilAgotado(pedido, caracas('2026-08-01T10:00'), 3, tienda(), ZONA),
    ).toBe(true);
  });

  it('un pedido del domingo no empieza a contar hasta el lunes a las 8', () => {
    const pedido = caracas('2026-08-02T14:00');

    expect(
      plazoHabilAgotado(pedido, caracas('2026-08-03T08:00'), 3, tienda(), ZONA),
    ).toBe(false);
    expect(
      plazoHabilAgotado(pedido, caracas('2026-08-03T10:59'), 3, tienda(), ZONA),
    ).toBe(false);
    expect(
      plazoHabilAgotado(pedido, caracas('2026-08-03T11:00'), 3, tienda(), ZONA),
    ).toBe(true);
  });

  it('un pedido de las 23:00 no vence a las 2 de la madrugada', () => {
    const pedido = caracas('2026-07-29T23:00');

    // Con el reloj corrido habría vencido a las 02:00. Con el hábil, a las 11.
    expect(
      plazoHabilAgotado(pedido, caracas('2026-07-30T02:00'), 3, tienda(), ZONA),
    ).toBe(false);
    expect(
      plazoHabilAgotado(pedido, caracas('2026-07-30T11:00'), 3, tienda(), ZONA),
    ).toBe(true);
  });

  it('en pleno horario el plazo se comporta como horas corridas', () => {
    const pedido = caracas('2026-07-30T09:00');

    expect(
      plazoHabilAgotado(pedido, caracas('2026-07-30T11:59'), 3, tienda(), ZONA),
    ).toBe(false);
    expect(
      plazoHabilAgotado(pedido, caracas('2026-07-30T12:00'), 3, tienda(), ZONA),
    ).toBe(true);
  });

  /**
   * El plazo es el que se le pasa, no uno fijo. Sin esto, un
   * `plazoHabilAgotado` que ignorara `horas` pasaría casi todo lo de arriba.
   */
  it('respeta el número de horas que se le da', () => {
    const pedido = caracas('2026-07-30T09:00');
    const alMediodia = caracas('2026-07-30T12:00');

    expect(plazoHabilAgotado(pedido, alMediodia, 2, tienda(), ZONA)).toBe(true);
    expect(plazoHabilAgotado(pedido, alMediodia, 3, tienda(), ZONA)).toBe(true);
    expect(plazoHabilAgotado(pedido, alMediodia, 4, tienda(), ZONA)).toBe(
      false,
    );
  });
});

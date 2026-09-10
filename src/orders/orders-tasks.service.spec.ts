import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrdersTasksService } from './orders-tasks.service';
import { OrdersService } from './orders.service';
import { ordersConfig } from '../config/configuration';
import { parseHorarioComercial } from './horario-habil';

/**
 * El cron que libera el stock de los pedidos sin pagar, y sobre todo el plazo
 * con el que corre.
 *
 * Un plazo mal escrito acá no borra filas: anula pedidos de clientes reales y
 * les devuelve la mercancía al catálogo. `ORDERS_UNPAID_RELEASE_HOURS=3e9`
 * leído con `parseInt` daría 3, y una liberación que en realidad tenía que ser
 * de tres mil millones de horas se convertiría en una anulación masiva
 * informando de éxito. Por eso un valor que no se entiende NO cae al defecto:
 * no se cancela nada y queda un aviso en el log.
 */
describe('OrdersTasksService — liberación de pedidos sin pagar', () => {
  let tasks: OrdersTasksService;
  let ordersService: { liberarPedidosSinPagar: jest.Mock };
  let horasConfiguradas: number | null | undefined;
  let horarioConfigurado: string | undefined;
  let horasEsperandoDatos: number | null | undefined;
  let avisos: string[];

  beforeEach(async () => {
    avisos = [];
    horarioConfigurado = '1-5:08:00-17:00;6:08:00-12:00';
    horasEsperandoDatos = 18;
    ordersService = {
      liberarPedidosSinPagar: jest
        .fn()
        .mockResolvedValue({ liberados: 0, omitidos: 0, fallidos: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersTasksService,
        { provide: OrdersService, useValue: ordersService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((clave: string) => {
              if (clave === 'orders.unpaidReleaseHours')
                return horasConfiguradas;
              if (clave === 'orders.unpaidReleaseHoursAwaitingDetails')
                return horasEsperandoDatos;
              if (clave === 'orders.businessHours') return horarioConfigurado;
              if (clave === 'app.storeTimezone') return 'America/Caracas';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    tasks = module.get(OrdersTasksService);

    // El aviso del log es la ÚNICA señal de que el plazo está mal escrito, así
    // que se comprueba que exista y no sólo que no se cancele nada.
    jest
      .spyOn(tasks['logger'], 'warn')
      .mockImplementation((mensaje: unknown) => {
        avisos.push(String(mensaje));
      });
    jest.spyOn(tasks['logger'], 'log').mockImplementation(() => undefined);
    jest.spyOn(tasks['logger'], 'debug').mockImplementation(() => undefined);
    jest.spyOn(tasks['logger'], 'error').mockImplementation(() => undefined);
  });

  it('libera con las horas configuradas', async () => {
    horasConfiguradas = 3;

    await tasks.handleUnpaidOrderRelease();

    expect(ordersService.liberarPedidosSinPagar).toHaveBeenCalledWith(
      3,
      18,
      parseHorarioComercial('1-5:08:00-17:00;6:08:00-12:00'),
      'America/Caracas',
    );
  });

  it('pasa el plazo del entorno, no uno fijo en el código', async () => {
    horasConfiguradas = 12;

    await tasks.handleUnpaidOrderRelease();

    expect(ordersService.liberarPedidosSinPagar).toHaveBeenCalledWith(
      12,
      18,
      expect.any(Map),
      'America/Caracas',
    );
  });

  describe('un plazo mal configurado no cancela nada', () => {
    it('con null no llama a la liberación y avisa por log', async () => {
      horasConfiguradas = null;

      await tasks.handleUnpaidOrderRelease();

      expect(ordersService.liberarPedidosSinPagar).not.toHaveBeenCalled();
      expect(avisos.join(' ')).toContain('ORDERS_UNPAID_RELEASE_HOURS');
    });

    it('con la clave ausente tampoco cancela', async () => {
      horasConfiguradas = undefined;

      await tasks.handleUnpaidOrderRelease();

      expect(ordersService.liberarPedidosSinPagar).not.toHaveBeenCalled();
      expect(avisos).toHaveLength(1);
    });
  });

  /**
   * Y lo mismo con el horario. Un horario a medias es peor que uno ausente: no
   * deja el reloj parado, lo deja corriendo con la tienda cerrada, que es
   * exactamente lo que este cambio venía a evitar.
   */
  describe('un horario mal configurado tampoco cancela nada', () => {
    it.each([
      ['', 'vacío'],
      ['Lunes a Viernes: 8:00 AM - 5:00 PM', 'la prosa de STORE_HOURS'],
      ['1-5:17:00-08:00', 'cierra antes de abrir'],
      ['0-5:08:00-17:00', 'un día fuera de 1..7'],
      ['1-5:08:00-17:00;', 'un ";" de más'],
    ])(
      'con %p (%s) no llama a la liberación y avisa por log',
      async (texto) => {
        horasConfiguradas = 3;
        horarioConfigurado = texto;

        await tasks.handleUnpaidOrderRelease();

        expect(ordersService.liberarPedidosSinPagar).not.toHaveBeenCalled();
        expect(avisos.join(' ')).toContain('ORDERS_BUSINESS_HOURS');
      },
    );
  });

  /**
   * El plazo largo de Zelle se valida igual que el corto, y con la misma
   * consecuencia: si no se entiende, NO SE LIBERA NADA — tampoco los pedidos de
   * los otros métodos. Media pasada aplicada es más difícil de razonar que
   * ninguna, y la dirección segura es no cancelar.
   */
  describe('el plazo de los que esperan datos también se valida', () => {
    it('con null no llama a la liberación y avisa por log', async () => {
      horasConfiguradas = 3;
      horasEsperandoDatos = null;

      await tasks.handleUnpaidOrderRelease();

      expect(ordersService.liberarPedidosSinPagar).not.toHaveBeenCalled();
      expect(avisos.join(' ')).toContain(
        'ORDERS_UNPAID_RELEASE_HOURS_AWAITING_DETAILS',
      );
    });

    it('detiene la pasada entera, no sólo los Zelle', async () => {
      horasConfiguradas = 3;
      horasEsperandoDatos = undefined;

      await tasks.handleUnpaidOrderRelease();

      expect(ordersService.liberarPedidosSinPagar).not.toHaveBeenCalled();
    });

    it('pasa el plazo largo del entorno, no uno fijo en el código', async () => {
      horasConfiguradas = 3;
      horasEsperandoDatos = 40;

      await tasks.handleUnpaidOrderRelease();

      expect(ordersService.liberarPedidosSinPagar).toHaveBeenCalledWith(
        3,
        40,
        expect.any(Map),
        'America/Caracas',
      );
    });
  });

  /**
   * La zona del reloj es la de la tienda, no la del servidor. Un despliegue en
   * UTC contaría las franjas cuatro horas corridas.
   */
  it('cuenta con la zona horaria de la tienda', async () => {
    horasConfiguradas = 3;

    await tasks.handleUnpaidOrderRelease();

    expect(ordersService.liberarPedidosSinPagar).toHaveBeenCalledWith(
      3,
      18,
      expect.any(Map),
      'America/Caracas',
    );
  });

  it('un error de la liberación no propaga fuera del cron', async () => {
    horasConfiguradas = 3;
    ordersService.liberarPedidosSinPagar.mockRejectedValue(
      new Error('la base se cayó'),
    );

    await expect(tasks.handleUnpaidOrderRelease()).resolves.toBeUndefined();
  });
});

/**
 * La lectura del entorno, sobre el `registerAs` de verdad.
 *
 * Va acá y no en un fichero aparte porque es la misma decisión: qué plazo
 * termina llegando al cron. Las cadenas de esta tabla son las que de verdad
 * escribe alguien al configurar la tienda.
 */
describe('ordersConfig — ORDERS_UNPAID_RELEASE_HOURS', () => {
  const original = process.env.ORDERS_UNPAID_RELEASE_HOURS;

  afterEach(() => {
    if (original === undefined) delete process.env.ORDERS_UNPAID_RELEASE_HOURS;
    else process.env.ORDERS_UNPAID_RELEASE_HOURS = original;
  });

  const leer = (valor: string | undefined): number | null => {
    if (valor === undefined) delete process.env.ORDERS_UNPAID_RELEASE_HOURS;
    else process.env.ORDERS_UNPAID_RELEASE_HOURS = valor;
    return ordersConfig().unpaidReleaseHours;
  };

  it('sin configurar usa el defecto de 3 horas', () => {
    expect(leer(undefined)).toBe(3);
  });

  it('acepta un entero positivo', () => {
    expect(leer('6')).toBe(6);
    expect(leer(' 24 ')).toBe(24);
  });

  /**
   * El caso que motivó todo esto. `parseInt('3e9')` devuelve 3: el plazo de
   * tres mil millones de horas que alguien creía haber escrito se convertía en
   * tres, y el cron anulaba pedidos con cara de estar funcionando. Ninguno de
   * estos puede terminar en un número.
   */
  it.each(['3e9', '3e2', '3_000', '3 horas', '3.5', '-3', '0', '', 'tres'])(
    '"%s" no se entiende: null, y no el defecto',
    (valor) => {
      expect(leer(valor)).toBeNull();
    },
  );

  it('en particular, 3e9 NO se lee como 3', () => {
    expect(leer('3e9')).not.toBe(3);
    expect(leer('3e9')).toBeNull();
  });

  /**
   * El horario por defecto es el real de la tienda, y tiene que ser
   * interpretable: si el defecto fuera basura, una instalación recién montada
   * no cancelaría nada nunca y nadie sabría por qué.
   */
  it('el horario por defecto es el de la tienda y se entiende', () => {
    delete process.env.ORDERS_BUSINESS_HOURS;

    const horario = parseHorarioComercial(ordersConfig().businessHours);

    expect(horario).not.toBeNull();
    expect(horario!.get(1)).toEqual([{ inicio: 480, fin: 1020 }]);
    expect(horario!.get(6)).toEqual([{ inicio: 480, fin: 720 }]);
    expect(horario!.get(7)).toBeUndefined();
  });

  it('un horario del entorno mal escrito no cae al defecto', () => {
    process.env.ORDERS_BUSINESS_HOURS = '1-5:17:00-08:00';

    expect(parseHorarioComercial(ordersConfig().businessHours)).toBeNull();

    delete process.env.ORDERS_BUSINESS_HOURS;
  });

  /**
   * El plazo largo, con la misma tabla de dedazos. Su defecto son 18 horas
   * hábiles: dos días de atención, que es lo que hace falta para que un
   * operador escriba y el cliente llegue al banco.
   */
  describe('ORDERS_UNPAID_RELEASE_HOURS_AWAITING_DETAILS', () => {
    const originalLargo =
      process.env.ORDERS_UNPAID_RELEASE_HOURS_AWAITING_DETAILS;

    afterEach(() => {
      if (originalLargo === undefined)
        delete process.env.ORDERS_UNPAID_RELEASE_HOURS_AWAITING_DETAILS;
      else
        process.env.ORDERS_UNPAID_RELEASE_HOURS_AWAITING_DETAILS =
          originalLargo;
    });

    const leerLargo = (valor: string | undefined): number | null => {
      if (valor === undefined)
        delete process.env.ORDERS_UNPAID_RELEASE_HOURS_AWAITING_DETAILS;
      else process.env.ORDERS_UNPAID_RELEASE_HOURS_AWAITING_DETAILS = valor;
      return ordersConfig().unpaidReleaseHoursAwaitingDetails;
    };

    it('sin configurar usa el defecto de 18 horas hábiles', () => {
      expect(leerLargo(undefined)).toBe(18);
    });

    it('es más largo que el plazo normal por defecto', () => {
      delete process.env.ORDERS_UNPAID_RELEASE_HOURS;
      const config = ordersConfig();
      expect(config.unpaidReleaseHoursAwaitingDetails).toBeGreaterThan(
        config.unpaidReleaseHours as number,
      );
    });

    it.each([
      '18e9',
      '18_000',
      '18 horas',
      '18.5',
      '-18',
      '0',
      '',
      'dieciocho',
    ])('"%s" no se entiende: null, y no el defecto', (valor) => {
      expect(leerLargo(valor)).toBeNull();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import {
  PaymentInfo,
  PaymentMethod,
  PaymentStatus,
} from './payment-info.entity';
import { Cart } from '../cart/cart.entity';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';
import { GuestCustomersService } from './guest-customers.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { DiscountsService } from '../discounts/discounts.service';
import { BanksService } from '../banks/banks.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { OrderPricingService } from './order-pricing.service';
import { parseHorarioComercial, HorarioComercial } from './horario-habil';

const mockService = () => ({});

/**
 * El QueryBuilder falso. Tipado explícito porque el objeto se referencia a sí
 * mismo para encadenar (`.where(...)` devuelve `qb`), y sin anotación
 * TypeScript lo infiere como `any` y el encadenado deja de comprobarse.
 */
interface QbFalso {
  innerJoinAndSelect: jest.Mock<QbFalso>;
  where: jest.Mock<QbFalso>;
  andWhere: jest.Mock<QbFalso>;
  getMany: jest.Mock<Promise<Order[]>>;
}

const ZONA = 'America/Caracas';
const HORARIO = parseHorarioComercial(
  '1-5:08:00-17:00;6:08:00-12:00',
) as HorarioComercial;

/** Hora de pared de Caracas (UTC-4, sin horario de verano). */
const caracas = (iso: string): Date => new Date(`${iso}:00.000-04:00`);

/**
 * La liberación automática del stock de los pedidos sin pagar.
 *
 * Lo que se juega acá no es que el cron cancele: es que NO cancele lo que no
 * debe. Un pedido en el que el cliente aportó datos de pago —comprobante,
 * referencia, emisor, banco— es alguien que ya pagó y está esperando a la
 * tienda; anulárselo por el retraso de la propia tienda es peor que la fuga de
 * stock que este cron viene a tapar.
 *
 * **Por qué el falso QueryBuilder devuelve TODO lo que hay, sin filtrar.**
 * Es deliberado y es lo que hace que estas pruebas valgan algo. Si el doble
 * aplicara por su cuenta el filtro de evidencia, la prueba de «no se cancela
 * al que dio su referencia» pasaría sola: el candidato ni siquiera llegaría al
 * método. Devolviendo todo, quien tiene que frenar es el código de producción,
 * y borrar la guarda tumba la prueba. El filtro de la consulta se comprueba
 * aparte, mirando el SQL que se le pidió.
 */
describe('OrdersService.liberarPedidosSinPagar', () => {
  let service: OrdersService;
  let productRepo: { increment: jest.Mock };
  let emailService: { sendOrderReleased: jest.Mock };
  let andWheres: string[];
  let enLaBase: Order[];

  /**
   * Un pago SIN nada aportado, tal como lo guarda el checkout cuando el cliente
   * no rellena el paso de pago: cadenas vacías, no `NULL`. Se ve tal cual en
   * los pedidos 31, 32 y 37 de la base real.
   */
  const pagoVacio = (extra: Partial<PaymentInfo> = {}): PaymentInfo =>
    ({
      id: 1,
      // PAGOMÓVIL y no Zelle: un pedido Zelle vacío es un cliente esperando
      // datos de la tienda, no un pedido basura, y tiene su propio plazo.
      method: PaymentMethod.PAGOMOVIL,
      status: PaymentStatus.PENDING,
      senderName: '',
      senderBank: '',
      phoneNumber: '',
      cedula: '',
      bankId: null,
      referenceCode: '',
      accountName: '',
      transferBankId: null,
      referenceNumber: '',
      receiptKey: null,
      receiptUrl: null,
      notes: null,
      ...extra,
    }) as unknown as PaymentInfo;

  const pedido = (
    uuid: string,
    paymentInfo: PaymentInfo,
    overrides: Partial<Order> = {},
  ): Order =>
    ({
      id: Number(uuid.replace(/\D/g, '')) || 1,
      uuid,
      orderNumber: `ORD-${uuid}`,
      guestEmail: 'cliente@example.com',
      status: OrderStatus.ON_HOLD,
      // Lunes a las 9 de la mañana: dentro del horario, para que el reloj
      // hábil no sea lo que decide en las pruebas que no van de eso.
      createdAt: caracas('2026-07-27T09:00'),
      paymentInfo,
      items: [
        { id: 1, productId: 10, quantity: 3 },
        { id: 2, productId: 20, quantity: 5 },
      ],
      ...overrides,
    }) as unknown as Order;

  /** Lunes al mediodía: tres horas hábiles después de las 9:00. */
  const AL_MEDIODIA = caracas('2026-07-27T12:00');

  const liberar = (
    horas = 3,
    ahora: Date = AL_MEDIODIA,
    horasEsperandoDatos = 18,
  ) => {
    jest.useFakeTimers().setSystemTime(ahora);
    const promesa = service.liberarPedidosSinPagar(
      horas,
      horasEsperandoDatos,
      HORARIO,
      ZONA,
    );
    jest.useRealTimers();
    return promesa;
  };

  beforeEach(async () => {
    andWheres = [];
    enLaBase = [];

    const orderRepo = {
      // `findOne` es la relectura fresca de cada candidato: resuelve por uuid
      // contra el mismo conjunto, así que si la guarda del código no mira los
      // datos de pago, el pedido pagado sigue su camino hasta la cancelación.
      findOne: jest.fn(({ where }: { where: { uuid: string } }) =>
        Promise.resolve(enLaBase.find((o) => o.uuid === where.uuid) ?? null),
      ),
      save: jest.fn((o: Order) => Promise.resolve(o)),
      createQueryBuilder: jest.fn((): QbFalso => {
        const qb: QbFalso = {
          innerJoinAndSelect: jest.fn(() => qb),
          where: jest.fn(() => qb),
          andWhere: jest.fn((clausula: string) => {
            andWheres.push(clausula);
            return qb;
          }),
          getMany: jest.fn(() =>
            Promise.resolve(
              enLaBase.filter((o) => o.status === OrderStatus.ON_HOLD),
            ),
          ),
        };
        return qb;
      }),
    };

    productRepo = { increment: jest.fn().mockResolvedValue(undefined) };
    emailService = {
      sendOrderReleased: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: {} },
        { provide: getRepositoryToken(ShippingAddress), useValue: {} },
        { provide: getRepositoryToken(PaymentInfo), useValue: {} },
        { provide: getRepositoryToken(Cart), useValue: {} },
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: EmailService, useValue: emailService },
        { provide: DiscountsService, useFactory: mockService },
        { provide: BanksService, useFactory: mockService },
        { provide: GuestCustomersService, useFactory: mockService },
        { provide: UsersService, useFactory: mockService },
        { provide: ExchangeRatesService, useFactory: mockService },
        { provide: OrderPricingService, useFactory: mockService },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Un caso por cada tipo de evidencia de pago. La lista no es decorativa: cada
   * uno de estos campos lo teclea el cliente en el paso de pago del checkout y
   * ninguno se rellena solo, así que cualquiera de ellos significa «ya pagué,
   * están ustedes revisando». Si alguien quita un campo de
   * `CAMPOS_EVIDENCIA_DE_PAGO`, exactamente una de estas pruebas se cae y dice
   * cuál.
   */
  describe('ningún pedido con datos de pago aportados se cancela', () => {
    it.each([
      ['comprobante en S3', { receiptKey: 'comprobantes/2026/07/ORD-36.jpg' }],
      ['comprobante viejo por URL', { receiptUrl: 'https://b.s3.aws/v.jpg' }],
      ['referencia de pago móvil', { referenceCode: '3744' }],
      ['referencia de transferencia', { referenceNumber: '999888' }],
      ['nombre del emisor del Zelle', { senderName: 'Ana Pérez' }],
      ['banco emisor del Zelle', { senderBank: 'Bank of America' }],
      ['titular de la cuenta transferida', { accountName: 'Ana Pérez' }],
      ['teléfono del pagador', { phoneNumber: '04121234567' }],
      ['cédula del pagador', { cedula: 'V-2345678' }],
      ['banco elegido para el pago móvil', { bankId: 25 }],
      ['banco elegido para la transferencia', { transferBankId: 2 }],
      [
        'nota del cliente sobre el pago',
        { notes: 'transferí desde otra cuenta' },
      ],
    ])('respeta el pedido con %s', async (_que, campo) => {
      enLaBase = [pedido('36', pagoVacio(campo as Partial<PaymentInfo>))];

      const resultado = await liberar();

      expect(resultado.liberados).toBe(0);
      expect(resultado.omitidos).toBe(1);
      // Ni se anuló ni se le devolvió inventario: las dos mitades del daño.
      expect(enLaBase[0].status).toBe(OrderStatus.ON_HOLD);
      expect(productRepo.increment).not.toHaveBeenCalled();
      expect(emailService.sendOrderReleased).not.toHaveBeenCalled();
    });

    /**
     * El estado del pago NO puede usarse como señal de «no pagó»: nace en
     * `pending` y sigue en `pending` hasta que un humano lo revisa. En la base
     * de esta tienda TODOS los pagos aportados están en `pending`.
     */
    it('respeta la evidencia aunque el pago siga sin verificar', async () => {
      enLaBase = [
        pedido(
          '36',
          pagoVacio({
            referenceCode: '3744',
            status: PaymentStatus.PENDING,
          }),
        ),
      ];

      expect((await liberar()).omitidos).toBe(1);
      expect(enLaBase[0].status).toBe(OrderStatus.ON_HOLD);
    });

    /** Y un pago ya dado por bueno a mano no se toca ni con las columnas vacías. */
    it('respeta el pago ya verificado por la tienda', async () => {
      enLaBase = [pedido('36', pagoVacio({ status: PaymentStatus.VERIFIED }))];

      expect((await liberar()).omitidos).toBe(1);
      expect(enLaBase[0].status).toBe(OrderStatus.ON_HOLD);
    });

    /** Sin fila de pago no hay forma de saber nada: ante la duda, no se cancela. */
    it('no cancela el pedido sin fila de pago', async () => {
      enLaBase = [pedido('36', undefined as unknown as PaymentInfo)];

      expect((await liberar()).liberados).toBe(0);
      expect(productRepo.increment).not.toHaveBeenCalled();
    });

    it('con dos candidatos, cancela sólo al que no aportó nada', async () => {
      enLaBase = [
        pedido('36', pagoVacio({ referenceCode: '3744' })),
        pedido('37', pagoVacio()),
      ];

      const resultado = await liberar();

      expect(resultado).toEqual({ liberados: 1, omitidos: 1, fallidos: 0 });
      expect(enLaBase[0].status).toBe(OrderStatus.ON_HOLD);
      expect(enLaBase[1].status).toBe(OrderStatus.CANCELLED);
    });
  });

  /**
   * La otra mitad del filtro: que la consulta tampoco los traiga. Va aparte
   * porque el doble de arriba devuelve todo a propósito; sin esto, borrar el
   * filtro de la consulta real no rompería ninguna prueba y el cron se traería
   * de la base pedidos pagados para descartarlos después.
   */
  describe('la consulta de candidatos', () => {
    const sql = () => andWheres.join(' | ');

    beforeEach(async () => {
      enLaBase = [];
      await liberar();
    });

    it.each([
      'receiptKey',
      'receiptUrl',
      'referenceCode',
      'referenceNumber',
      'senderName',
      'senderBank',
      'accountName',
      'phoneNumber',
      'cedula',
      'bankId',
      'transferBankId',
      'notes',
    ])('excluye por SQL a quien tenga %s', (campo) => {
      expect(sql()).toContain(`pago.${campo}`);
    });

    it('trata la cadena vacía como ausencia, igual que NULL', () => {
      // Sin el COALESCE, las once columnas que el checkout guarda como '' no
      // serían nunca NULL y la consulta no devolvería jamás un candidato: el
      // cron pasaría a no cancelar nada, en silencio y con cara de funcionar.
      expect(sql()).toContain('COALESCE');
      expect(sql()).toContain("= ''");
    });

    it('excluye los pagos ya verificados y acota por fecha', () => {
      expect(sql()).toContain('pago.status !=');
      expect(sql()).toContain('createdAt');
    });
  });

  describe('un pedido sin datos de pago y con el plazo agotado sí se cancela', () => {
    it('lo deja en CANCELLED', async () => {
      enLaBase = [pedido('37', pagoVacio())];

      expect((await liberar()).liberados).toBe(1);
      expect(enLaBase[0].status).toBe(OrderStatus.CANCELLED);
    });

    it('devuelve al inventario las unidades de cada renglón', async () => {
      enLaBase = [pedido('37', pagoVacio())];

      await liberar();

      expect(productRepo.increment).toHaveBeenCalledTimes(2);
      expect(productRepo.increment).toHaveBeenCalledWith(
        { id: 10 },
        'inventory',
        3,
      );
      expect(productRepo.increment).toHaveBeenCalledWith(
        { id: 20 },
        'inventory',
        5,
      );
    });

    it('avisa al cliente con el plazo que de verdad se le aplicó', async () => {
      enLaBase = [pedido('37', pagoVacio())];

      await liberar(3);

      expect(emailService.sendOrderReleased).toHaveBeenCalledTimes(1);
      expect(emailService.sendOrderReleased).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELLED }),
        3,
        false,
      );
    });
  });

  /**
   * El reloj hábil, que es lo que cambia respecto de contar horas seguidas.
   * Con relojes falsos: lo que decide no es cuánto rato pasó, sino cuánto rato
   * ABIERTO pasó.
   */
  describe('el plazo se cuenta en horas hábiles', () => {
    it('no cancela el pedido del viernes a las 16:00 esa misma noche', async () => {
      enLaBase = [
        pedido('37', pagoVacio(), { createdAt: caracas('2026-07-31T16:00') }),
      ];

      // Las 23:00 del viernes: siete horas corridas, una sola hábil.
      const resultado = await liberar(3, caracas('2026-07-31T23:00'));

      expect(resultado.liberados).toBe(0);
      expect(resultado.omitidos).toBe(1);
      expect(enLaBase[0].status).toBe(OrderStatus.ON_HOLD);
      expect(productRepo.increment).not.toHaveBeenCalled();
    });

    it('sí lo cancela el sábado a las 10:00, cuando se cumplen las tres hábiles', async () => {
      enLaBase = [
        pedido('37', pagoVacio(), { createdAt: caracas('2026-07-31T16:00') }),
      ];

      const resultado = await liberar(3, caracas('2026-08-01T10:00'));

      expect(resultado.liberados).toBe(1);
      expect(enLaBase[0].status).toBe(OrderStatus.CANCELLED);
    });

    it('el pedido del domingo no vence hasta el lunes por la mañana', async () => {
      const domingo = { createdAt: caracas('2026-08-02T14:00') };
      enLaBase = [pedido('37', pagoVacio(), domingo)];

      // Lunes a las 10:59: dos horas hábiles y 59 minutos.
      expect((await liberar(3, caracas('2026-08-03T10:59'))).liberados).toBe(0);
      expect(enLaBase[0].status).toBe(OrderStatus.ON_HOLD);

      // Lunes a las 11:00: las tres cumplidas.
      expect((await liberar(3, caracas('2026-08-03T11:00'))).liberados).toBe(1);
      expect(enLaBase[0].status).toBe(OrderStatus.CANCELLED);
    });

    it('el pedido de las 23:00 no vence a las 2 de la madrugada', async () => {
      enLaBase = [
        pedido('37', pagoVacio(), { createdAt: caracas('2026-07-29T23:00') }),
      ];

      // Con el reloj corrido —el que se implementó primero— acá había vencido.
      expect((await liberar(3, caracas('2026-07-30T02:00'))).liberados).toBe(0);
      expect(enLaBase[0].status).toBe(OrderStatus.ON_HOLD);
    });

    it('no cancela lo que todavía no cumplió el plazo en pleno horario', async () => {
      enLaBase = [pedido('37', pagoVacio())]; // lunes 09:00

      expect((await liberar(3, caracas('2026-07-27T11:59'))).liberados).toBe(0);
      expect((await liberar(3, caracas('2026-07-27T12:00'))).liberados).toBe(1);
    });

    /**
     * El plazo que llega a la consulta es un límite en horas CORRIDAS, y eso es
     * correcto porque el tiempo hábil nunca supera al corrido: lo que la
     * consulta descarta tampoco habría vencido en horas hábiles. Sin esto, un
     * `liberarPedidosSinPagar` que ignorara el argumento y comparara contra
     * `now()` traería pedidos recién creados.
     */
    it('el plazo se traduce a una fecha límite hacia atrás', async () => {
      let limite: Date | undefined;

      const repo = service as unknown as {
        orderRepository: { createQueryBuilder: jest.Mock };
      };
      repo.orderRepository.createQueryBuilder = jest.fn((): QbFalso => {
        const qb: QbFalso = {
          innerJoinAndSelect: jest.fn(() => qb),
          where: jest.fn(() => qb),
          andWhere: jest.fn((_c: string, params?: { limite?: Date }) => {
            if (params?.limite) limite = params.limite;
            return qb;
          }),
          getMany: jest.fn(() => Promise.resolve([])),
        };
        return qb;
      });

      const ahora = caracas('2026-07-27T12:00');
      await liberar(3, ahora);

      expect(limite).toEqual(new Date(ahora.getTime() - 3 * 60 * 60 * 1000));
    });

    /**
     * Y con el plazo de Zelle más corto que el normal —configuración rara pero
     * legal— el prefiltro tiene que usar ESE, o los Zelle no llegarían nunca a
     * la consulta. Sin el `Math.min`, un candidato queda fuera en SQL y ninguna
     * guarda posterior puede recuperarlo.
     */
    it('el prefiltro usa el menor de los dos plazos', async () => {
      let limite: Date | undefined;

      const repo = service as unknown as {
        orderRepository: { createQueryBuilder: jest.Mock };
      };
      repo.orderRepository.createQueryBuilder = jest.fn((): QbFalso => {
        const qb: QbFalso = {
          innerJoinAndSelect: jest.fn(() => qb),
          where: jest.fn(() => qb),
          andWhere: jest.fn((_c: string, params?: { limite?: Date }) => {
            if (params?.limite) limite = params.limite;
            return qb;
          }),
          getMany: jest.fn(() => Promise.resolve([])),
        };
        return qb;
      });

      const ahora = caracas('2026-07-27T12:00');
      await liberar(5, ahora, 2);

      expect(limite).toEqual(new Date(ahora.getTime() - 2 * 60 * 60 * 1000));
    });
  });

  describe('un correo caído no impide la liberación', () => {
    it('el stock vuelve y el pedido queda anulado aunque falle el SMTP', async () => {
      emailService.sendOrderReleased.mockRejectedValue(new Error('SMTP caído'));
      enLaBase = [pedido('37', pagoVacio())];

      const resultado = await liberar();

      expect(resultado).toEqual({ liberados: 1, omitidos: 0, fallidos: 0 });
      expect(enLaBase[0].status).toBe(OrderStatus.CANCELLED);
      expect(productRepo.increment).toHaveBeenCalledTimes(2);
    });

    /**
     * Y no se lleva por delante el resto de la pasada: con el correo caído en
     * el primer pedido, el segundo tiene que liberarse igual. Un `await` pelado
     * abortaba el recorrido entero en el primer fallo.
     */
    it('el fallo del primer correo no aborta el resto de la pasada', async () => {
      emailService.sendOrderReleased.mockRejectedValue(new Error('SMTP caído'));
      enLaBase = [pedido('37', pagoVacio()), pedido('38', pagoVacio())];

      const resultado = await liberar();

      expect(resultado.liberados).toBe(2);
      expect(enLaBase[1].status).toBe(OrderStatus.CANCELLED);
      expect(productRepo.increment).toHaveBeenCalledTimes(4);
    });
  });

  /**
   * La otra mitad de tragarse los fallos: que no se haya apagado el envío. Sin
   * esto, un `avisaLiberacion` vacío pasaría todas las pruebas de arriba y el
   * cliente se encontraría el pedido anulado sin enterarse por ningún lado.
   */
  it('cuando el correo funciona, sale', async () => {
    enLaBase = [pedido('37', pagoVacio())];

    await liberar();

    expect(emailService.sendOrderReleased).toHaveBeenCalledTimes(1);
  });

  /**
   * **La regresión de Zelle.** Se descubrió hablando con el dueño, no leyendo
   * código, así que queda clavada acá.
   *
   * Zelle no publica datos de cuenta: un operador se los manda al cliente por
   * WhatsApp después del pedido. `ZelleForm.tsx` no tiene ni un campo y el
   * checkout manda `paymentDetails = {}`, así que el pedido llega con
   * `payment_info` ENTERO en blanco — idéntico, campo por campo, a un pedido
   * basura. Con el plazo normal, el cron le cancelaba a las tres horas hábiles
   * a un cliente que estaba haciendo exactamente lo que la pantalla le dijo:
   * esperar. Y esperando A LA TIENDA, que es el mismo principio por el que no
   * se toca un comprobante pendiente de revisar.
   */
  describe('Zelle: el cliente espera datos de la tienda, no al revés', () => {
    const zelleVacio = () => pagoVacio({ method: PaymentMethod.ZELLE });

    it('NO se cancela un Zelle vacío con el plazo normal agotado', async () => {
      // Lunes 09:00, y son las 12:00: tres horas hábiles cumplidas de sobra
      // para el plazo corto. Un pagomóvil idéntico sí caería acá.
      enLaBase = [pedido('40', zelleVacio())];

      const resultado = await liberar(3, AL_MEDIODIA, 18);

      expect(resultado.liberados).toBe(0);
      expect(resultado.omitidos).toBe(1);
      expect(enLaBase[0].status).toBe(OrderStatus.ON_HOLD);
      expect(productRepo.increment).not.toHaveBeenCalled();
      expect(emailService.sendOrderReleased).not.toHaveBeenCalled();
    });

    /**
     * El contraste que hace que la prueba de arriba signifique algo: el MISMO
     * `payment_info` vacío, en el mismo instante, con lo único distinto siendo
     * el método. Si alguien "arregla" esto haciendo que no se cancele nada,
     * esta prueba se cae.
     */
    it('el mismo pedido vacío con pagomóvil sí se cancela', async () => {
      enLaBase = [
        pedido('40', zelleVacio()),
        pedido('41', pagoVacio({ method: PaymentMethod.PAGOMOVIL })),
      ];

      const resultado = await liberar(3, AL_MEDIODIA, 18);

      expect(resultado).toEqual({ liberados: 1, omitidos: 1, fallidos: 0 });
      expect(enLaBase[0].status).toBe(OrderStatus.ON_HOLD);
      expect(enLaBase[1].status).toBe(OrderStatus.CANCELLED);
    });

    /**
     * Pero Zelle NO es inmortal, y esto es lo que impide que el arreglo
     * reabra el agujero: mandar `paymentMethod: "zelle"` sin ningún dato es
     * gratis —es justo lo que manda la tienda de verdad—, así que si nunca
     * caducara bastaría una palabra para apartar inventario para siempre.
     */
    it('sí se cancela cuando se agota SU plazo, el largo', async () => {
      enLaBase = [pedido('40', zelleVacio())];

      // Lunes 09:00 + 18 h hábiles = miércoles a las 12:00 (9h el lunes desde
      // las 9 son 8, +9 el martes = 17, +1 el miércoles = 18).
      const resultado = await liberar(3, caracas('2026-07-29T09:00'), 18);

      expect(resultado.liberados).toBe(1);
      expect(enLaBase[0].status).toBe(OrderStatus.CANCELLED);
      expect(productRepo.increment).toHaveBeenCalledTimes(2);
    });

    it('no se cancela un minuto antes de agotar su plazo largo', async () => {
      enLaBase = [pedido('40', zelleVacio())];

      const resultado = await liberar(3, caracas('2026-07-29T08:59'), 18);

      expect(resultado.liberados).toBe(0);
      expect(enLaBase[0].status).toBe(OrderStatus.ON_HOLD);
    });

    /**
     * El correo no puede decirle a un cliente Zelle que no pagó: estaba
     * esperando datos NUESTROS. La bandera va hasta `EmailService`.
     */
    it('el aviso reconoce que el cliente esperaba nuestros datos', async () => {
      enLaBase = [pedido('40', zelleVacio())];

      await liberar(3, caracas('2026-07-29T09:00'), 18);

      expect(emailService.sendOrderReleased).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELLED }),
        18,
        true,
      );
    });

    /** Y un Zelle que YA aportó su pago sigue protegido por la regla de siempre. */
    it('un Zelle con comprobante no se cancela ni pasado el plazo largo', async () => {
      enLaBase = [
        pedido(
          '40',
          pagoVacio({
            method: PaymentMethod.ZELLE,
            receiptKey: 'comprobantes/zelle.jpg',
          }),
        ),
      ];

      const resultado = await liberar(3, caracas('2026-08-30T09:00'), 18);

      expect(resultado.liberados).toBe(0);
      expect(enLaBase[0].status).toBe(OrderStatus.ON_HOLD);
    });
  });

  /**
   * Un pedido que cambió de estado entre la consulta y la relectura —lo acusó
   * el ERP, o un vendedor lo movió— no se cancela: `cancelOrder` sólo admite
   * `on-hold`, y llegar hasta él con otro estado sería un error contado como
   * fallo en vez de un pedido respetado.
   */
  it('no cancela el que dejó de estar on-hold entre la consulta y la relectura', async () => {
    const p = pedido('37', pagoVacio());
    enLaBase = [p];

    const repo = service as unknown as {
      orderRepository: { findOne: jest.Mock };
    };
    repo.orderRepository.findOne = jest.fn(() =>
      Promise.resolve({ ...p, status: OrderStatus.PENDING } as Order),
    );

    const resultado = await liberar();

    expect(resultado).toEqual({ liberados: 0, omitidos: 1, fallidos: 0 });
    expect(productRepo.increment).not.toHaveBeenCalled();
  });
});

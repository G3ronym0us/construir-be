import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DiscountsService } from './discounts.service';
import { Discount, DiscountType } from './discount.entity';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';

/**
 * `validateDiscount` era un ORÁCULO DE CUPONES, y se llega a él desde tres
 * rutas públicas sin autenticar: `POST /discounts/validate`,
 * `POST /orders/quote` y `POST /orders`.
 *
 * El fallo estaba en que el motivo del rechazo se devolvía al cliente:
 *
 *   - código que no existe  → "Cupón no válido"
 *   - código que SÍ existe, pero venció → "Este cupón ha expirado"
 *
 * Con esos dos mensajes se puede recorrer un diccionario de códigos y separar
 * los que la tienda ha emitido de los que no, sin sesión y —hasta este cambio—
 * sin límite de tasa. Está medido contra la base real: `DIODI` (existe,
 * vencido) devolvía "Este cupón ha expirado" y `NOEXISTE123` devolvía "Cupón no
 * válido". Otros tres estados —inactivo, aún no vigente, usos agotados— hacían
 * lo mismo, y el del monto mínimo encima soltaba la cifra.
 *
 * Un cupón vencido no es información inofensiva: revela qué códigos emite esta
 * tienda y con qué forma, que es la mitad del trabajo de adivinar el que está
 * vivo.
 *
 * Es la misma clase de fallo que se cerró en el buscador de invitados, y se
 * cierra con el mismo criterio: **los casos negativos devuelven exactamente lo
 * mismo, hasta el último byte**. Estas pruebas fijan las dos mitades: que
 * ningún rechazo se distingue de otro, y que el cupón bueno sigue aplicándose
 * (si la unificación se hubiera llevado por delante el camino feliz, la tienda
 * dejaría de aceptar cupones y nadie lo notaría hasta la primera promoción).
 */
describe('DiscountsService.validateDiscount — todos los rechazos son iguales', () => {
  let service: DiscountsService;
  const repo = { findOne: jest.fn() };

  /** Un cupón vivo del 10%, sobre el que cada caso rompe una sola condición. */
  const cupon = (over: Partial<Discount> = {}): Discount =>
    ({
      id: 1,
      uuid: 'desc-uuid',
      code: 'EXISTE10',
      description: 'Diez por ciento',
      type: DiscountType.PERCENTAGE,
      value: 10,
      isActive: true,
      startDate: null,
      endDate: null,
      maxUses: null,
      currentUses: 0,
      maxDiscountAmount: null,
      minPurchaseAmount: null,
      ...over,
    }) as unknown as Discount;

  const ayer = () => new Date(Date.now() - 86400000);
  const manana = () => new Date(Date.now() + 86400000);

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        DiscountsService,
        { provide: getRepositoryToken(Discount), useValue: repo },
        {
          provide: ExchangeRatesService,
          useValue: { getRate: jest.fn(() => Promise.resolve(100)) },
        },
      ],
    }).compile();
    service = mod.get(DiscountsService);
  });

  /** Devuelve la respuesta de validar un código con la fila que se le indique. */
  const validar = async (fila: Discount | null, total = 100) => {
    repo.findOne.mockResolvedValue(fila);
    return service.validateDiscount('EXISTE10', total);
  };

  describe('ningún rechazo se distingue de otro', () => {
    /**
     * Los cinco motivos de rechazo, más el "no existe". El objetivo de la
     * prueba es que las seis respuestas sean IDÉNTICAS entre sí — no que
     * coincidan con un texto concreto, que puede reescribirse.
     */
    const casos: Array<[string, Discount | null, number]> = [
      ['el código no existe', null, 100],
      ['existe pero está inactivo', cupon({ isActive: false }), 100],
      [
        'existe pero aún no empieza',
        cupon({ startDate: manana() } as Partial<Discount>),
        100,
      ],
      [
        'existe pero ya venció',
        cupon({ endDate: ayer() } as Partial<Discount>),
        100,
      ],
      [
        'existe pero agotó sus usos',
        cupon({ maxUses: 5, currentUses: 5 }),
        100,
      ],
      [
        'existe pero el pedido no llega al mínimo',
        cupon({ minPurchaseAmount: 500 } as Partial<Discount>),
        100,
      ],
    ];

    it('las seis respuestas son byte a byte la misma', async () => {
      const respuestas: string[] = [];

      for (const [, fila, total] of casos) {
        const r = await validar(fila, total);
        expect(r.valid).toBe(false);
        respuestas.push(JSON.stringify(r));
      }

      // Serializadas y metidas en un Set: si quedara UNA sola distinta, el Set
      // tendría más de un elemento. Comparar de a pares dejaría escapar el
      // caso en que dos motivos convergen y un tercero no.
      expect(new Set(respuestas).size).toBe(1);
      expect(respuestas).toHaveLength(6);
    });

    /**
     * La forma más fácil de cerrar el oráculo es también la peor: devolver el
     * `error` vacío. Pasaría todas las pruebas de arriba y dejaría al cliente
     * que escribió mal el cupón pagando de más sin entender por qué.
     *
     * Esta prueba fija el otro extremo del equilibrio: el mensaje tiene que
     * decirle que NO se aplicó y qué revisar, nombrando las tres causas
     * posibles a la vez para no delatar cuál es la suya.
     */
    it('el mensaje le sirve al cliente que escribió mal el cupón', async () => {
      const r = await validar(null);

      expect(typeof r.error).toBe('string');
      expect((r.error ?? '').length).toBeGreaterThan(20);
      expect(r.error).toMatch(/cupón/i);
      // Nombra las tres cosas que el cliente puede revisar, sin decir cuál es
      // la suya.
      expect(r.error).toMatch(/escrito/i);
      expect(r.error).toMatch(/vigente/i);
      expect(r.error).toMatch(/condicion/i);
    });

    /**
     * El caso del monto mínimo era el que más filtraba: además de confirmar
     * que el cupón existe, publicaba su umbral. Esta prueba lo fija aparte
     * porque es el que más tienta a "arreglar" devolviendo la cifra por
     * amabilidad con el cliente.
     */
    it('no publica el monto mínimo de un cupón que existe', async () => {
      const r = await validar(
        cupon({ minPurchaseAmount: 500 } as Partial<Discount>),
        100,
      );

      expect(r.error).not.toMatch(/500/);
      expect(JSON.stringify(r)).not.toMatch(/500/);
    });

    /** Ningún rechazo puede devolver el cupón ni ninguno de sus datos. */
    it('ningún rechazo devuelve datos del cupón', async () => {
      for (const [, fila, total] of casos) {
        const r = await validar(fila, total);
        expect(r.discount).toBeUndefined();
        expect(JSON.stringify(r)).not.toMatch(/EXISTE10|desc-uuid/);
      }
    });
  });

  /**
   * La otra mitad: unificar los rechazos no puede haber roto el cupón bueno.
   * Sin esto, `return CUPON_RECHAZADO` en el camino feliz pasaría todas las
   * pruebas de arriba y la tienda no aplicaría ni un descuento.
   */
  describe('el cupón válido sigue aplicándose', () => {
    it('devuelve el descuento calculado', async () => {
      const r = await validar(cupon(), 100);

      expect(r.valid).toBe(true);
      expect(r.error).toBeUndefined();
      expect(r.discount?.code).toBe('EXISTE10');
      expect(r.discount?.discountAmount).toBe(10);
      expect(r.discount?.finalTotal).toBe(90);
    });

    it('aplica el cupón cuando el pedido SÍ llega al mínimo', async () => {
      const r = await validar(
        cupon({ minPurchaseAmount: 50 } as Partial<Discount>),
        100,
      );

      expect(r.valid).toBe(true);
      expect(r.discount?.discountAmount).toBe(10);
    });
  });
});

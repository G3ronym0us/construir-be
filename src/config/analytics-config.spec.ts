import { analyticsConfig } from './configuration';

/**
 * `ANALYTICS_PAGE_VIEW_RETENTION_DAYS` lo edita el dueño de la tienda y decide
 * qué se borra cada madrugada. Se leía con `parseInt`, que se queda con el
 * prefijo numérico y descarta el resto sin avisar: `1e9`, `1_000` y `1 año` se
 * convertían los tres en `1`, y la purga pasaba a borrar todo lo anterior a un
 * día informando de éxito con una línea de log normal. Medido: con `1e9` se
 * borraron 400 de 401 filas.
 *
 * Estas pruebas fijan que el valor se valide entero y que lo que no se entienda
 * caiga a `null` —no al defecto—, porque quien lo consume no purga nada con
 * `null`: una tabla que crece es visible y reversible, un borrado no.
 */
describe('analyticsConfig — el plazo de retención se valida entero', () => {
  const original = process.env.ANALYTICS_PAGE_VIEW_RETENTION_DAYS;

  const leerPlazo = (valor?: string): number | null => {
    if (valor === undefined) {
      delete process.env.ANALYTICS_PAGE_VIEW_RETENTION_DAYS;
    } else {
      process.env.ANALYTICS_PAGE_VIEW_RETENTION_DAYS = valor;
    }
    return analyticsConfig().pageViewRetentionDays;
  };

  afterAll(() => {
    if (original === undefined) {
      delete process.env.ANALYTICS_PAGE_VIEW_RETENTION_DAYS;
    } else {
      process.env.ANALYTICS_PAGE_VIEW_RETENTION_DAYS = original;
    }
  });

  it('acepta un entero positivo', () => {
    expect(leerPlazo('180')).toBe(180);
    expect(leerPlazo('1')).toBe(1);
    expect(leerPlazo(' 90 ')).toBe(90);
  });

  it('usa 180 días cuando no hay nada configurado', () => {
    expect(leerPlazo(undefined)).toBe(180);
  });

  describe('los dedazos que parseInt convertía en 1 día', () => {
    it.each([['1e9'], ['1_000'], ['1 año'], ['180d'], ['1.5']])(
      '%s se rechaza entero en vez de leerse como su prefijo',
      (valor) => {
        expect(leerPlazo(valor)).toBeNull();
      },
    );
  });

  it.each([['abc'], [''], ['-5'], ['0'], ['  ']])(
    'rechaza %s',
    (valor) => {
      expect(leerPlazo(valor)).toBeNull();
    },
  );

  it('un valor inválido NO cae al defecto: caer a 180 escondería el dedazo', () => {
    expect(leerPlazo('1e9')).not.toBe(180);
    expect(leerPlazo('1e9')).toBeNull();
  });
});

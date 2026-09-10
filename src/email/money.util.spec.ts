import { formatVes } from './money.util';

describe('formatVes', () => {
  it('formatea en es-VE: punto de millares y coma decimal', () => {
    expect(formatVes(110526.1)).toBe('110.526,10');
    expect(formatVes(9489.66)).toBe('9.489,66');
  });

  it('siempre deja dos decimales', () => {
    expect(formatVes(20)).toBe('20,00');
    expect(formatVes('17.5')).toBe('17,50');
  });

  it('acepta el string que devuelve TypeORM para las columnas numeric', () => {
    expect(formatVes('36283.99')).toBe('36.283,99');
  });

  // Un monto ausente tiene que viajar como null para que la plantilla oculte
  // el bloque: "Bs. 0,00" y "Bs. null" son dos formas distintas de mentir.
  it.each([null, undefined])('devuelve null ante %p', (valor) => {
    expect(formatVes(valor)).toBeNull();
  });

  it('cero es un monto válido, no un ausente', () => {
    expect(formatVes(0)).toBe('0,00');
  });
});

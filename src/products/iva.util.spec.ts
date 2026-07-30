import { IvaType } from './enums/iva-type.enum';
import { fromBase, fromTotal, round2 } from './iva.util';

describe('iva.util', () => {
  describe('round2', () => {
    it('redondea a 2 decimales sin el error binario de Math.round(v*100)/100', () => {
      // Math.round(1.005 * 100) / 100 devuelve 1 porque 1.005*100 = 100.49999999999999
      expect(round2(1.005)).toBe(1.01);
      expect(round2(2.675)).toBe(2.68);
      expect(round2(0)).toBe(0);
      expect(round2(10)).toBe(10);
    });

    it('no devuelve NaN para magnitudes menores a 1e-6', () => {
      // JS imprime los números con magnitud < 1e-6 en notación exponencial
      // ("9e-7"), lo que rompe el desplazamiento de punto decimal por texto:
      // el template arma "9e-7e2", que Number() no puede parsear y da NaN.
      // Cualquier valor tan chico redondea a 0 en 2 decimales de todos modos.
      expect(round2(9e-7)).toBe(0);
      expect(round2(-9e-7)).toBe(0);
      expect(round2(1e-10)).toBe(0);
      // Justo en el umbral (1e-6 = 0.000001) todavía imprime en notación
      // decimal, así que ya funcionaba; se deja como referencia del límite.
      expect(round2(1e-6)).toBe(0);
    });

    it('sigue desempatando hacia arriba para valores normales', () => {
      // El guard de magnitudes chicas no debe interferir con el caso general.
      expect(round2(0.005)).toBe(0.01);
    });
  });

  describe('fromBase', () => {
    it('deriva el IVA hacia adelante en las cuatro alícuotas', () => {
      expect(fromBase(10, IvaType.NORMAL)).toEqual({
        base: 10,
        iva: 1.6,
        total: 11.6,
      });
      expect(fromBase(10, IvaType.EXENTO)).toEqual({
        base: 10,
        iva: 0,
        total: 10,
      });
      expect(fromBase(10, IvaType.REDUCIDO)).toEqual({
        base: 10,
        iva: 0.8,
        total: 10.8,
      });
      expect(fromBase(10, IvaType.LUJO)).toEqual({
        base: 10,
        iva: 2.4,
        total: 12.4,
      });
    });

    it('trata un ivaType ausente como NORMAL, no como exento', () => {
      expect(fromBase(10, undefined as unknown as IvaType).iva).toBe(1.6);
    });
  });

  describe('fromTotal', () => {
    it('extrae la base y el IVA de un monto inclusivo', () => {
      expect(fromTotal(11.6, IvaType.NORMAL)).toEqual({
        base: 10,
        iva: 1.6,
        total: 11.6,
      });
      expect(fromTotal(20.88, IvaType.NORMAL)).toEqual({
        base: 18,
        iva: 2.88,
        total: 20.88,
      });
      expect(fromTotal(10, IvaType.EXENTO)).toEqual({
        base: 10,
        iva: 0,
        total: 10,
      });
    });

    it('no pierde el céntimo en montos mínimos', () => {
      const r = fromTotal(0.01, IvaType.NORMAL);
      expect(r.base + r.iva).toBe(0.01);
    });
  });

  describe('invariante base + iva === total', () => {
    const tipos = [
      IvaType.NORMAL,
      IvaType.EXENTO,
      IvaType.REDUCIDO,
      IvaType.LUJO,
    ];

    it('se cumple exacto en fromTotal para 5.000 montos × 4 alícuotas', () => {
      for (const tipo of tipos) {
        for (let centavos = 1; centavos <= 5000; centavos++) {
          const total = round2(centavos / 100);
          const r = fromTotal(total, tipo);
          expect(round2(r.base + r.iva)).toBe(total);
          expect(r.total).toBe(total);
        }
      }
    });

    it('se cumple exacto en fromBase para 5.000 montos × 4 alícuotas', () => {
      for (const tipo of tipos) {
        for (let centavos = 1; centavos <= 5000; centavos++) {
          const base = round2(centavos / 100);
          const r = fromBase(base, tipo);
          expect(round2(r.base + r.iva)).toBe(r.total);
          expect(r.base).toBe(base);
        }
      }
    });
  });
});

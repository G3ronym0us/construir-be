import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { FindOperator, FindOneOptions } from 'typeorm';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRate } from './exchange-rate.entity';
import { BCVService } from './bcv.service';
import { toIsoDate } from './date.util';

/**
 * Fecha local en 'YYYY-MM-DD'. Se usa la fecha **local** y no UTC porque
 * `findCurrent()`/`findByDate()` normalizan con `setHours(0,0,0,0)`, que es
 * local, y porque así serializa TypeORM un `Date` hacia una columna `date`.
 */
const localIso = (d: Date): string =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');

const isoDay = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return localIso(d);
};

const YESTERDAY = isoDay(-1);
const TODAY = isoDay(0);
const TOMORROW = isoDay(1);

const row = (date: string, rate: string): ExchangeRate =>
  ({ id: date, date, rate, source: 'bcv' }) as unknown as ExchangeRate;

/**
 * Repositorio falso que **interpreta** la cláusula `where` en vez de devolver
 * siempre lo mismo. Sin esto los tests de `findCurrent()` pasarían aunque la
 * consulta siguiera filtrando por hoy: es lo que los haría decorativos.
 */
const makeFakeRepo = (rows: ExchangeRate[]) => ({
  findOne: jest.fn((options: FindOneOptions<ExchangeRate>) => {
    const where = (options.where ?? {}) as {
      date?: FindOperator<Date> | Date;
    };
    let candidates = [...rows];

    if (where.date instanceof FindOperator) {
      if (where.date.type !== 'lessThanOrEqual') {
        throw new Error(
          `operador no soportado por el fake: ${where.date.type}`,
        );
      }
      const limit = localIso(where.date.value);
      candidates = candidates.filter((r) => toIsoDate(r.date) <= limit);
    } else if (where.date) {
      const exact = localIso(where.date);
      candidates = candidates.filter((r) => toIsoDate(r.date) === exact);
    }

    // order: { date: 'DESC' }
    candidates.sort((a, b) =>
      toIsoDate(b.date).localeCompare(toIsoDate(a.date)),
    );
    return Promise.resolve(candidates[0] ?? null);
  }),
  save: jest.fn(),
  create: jest.fn(),
});

describe('ExchangeRatesService.findCurrent / findByDate', () => {
  const build = async (rows: ExchangeRate[]) => {
    const repo = makeFakeRepo(rows);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesService,
        { provide: getRepositoryToken(ExchangeRate), useValue: repo },
        { provide: BCVService, useValue: { getBCVRate: jest.fn() } },
      ],
    }).compile();

    return module.get(ExchangeRatesService);
  };

  it('findCurrent() devuelve la fila fechada mañana cuando existe', async () => {
    // En modo `published`, entre las ~17:00 y medianoche, el cron guarda la
    // tasa bajo la fecha valor de mañana. Esa es la que ve el cliente en el
    // catálogo, así que es la que tiene que facturarse.
    const service = await build([
      row(TODAY, '744.22'),
      row(TOMORROW, '750.00'),
    ]);

    const current = await service.findCurrent();

    expect(toIsoDate(current.date)).toBe(TOMORROW);
    expect(Number(current.rate)).toBe(750);
  });

  it('getRate() sin fecha usa también la tasa publicada futura', async () => {
    const service = await build([
      row(TODAY, '744.22'),
      row(TOMORROW, '750.00'),
    ]);

    await expect(service.getRate()).resolves.toBe(750);
  });

  it('findCurrent() sigue devolviendo la más reciente cuando no hay filas futuras', async () => {
    const service = await build([
      row(YESTERDAY, '700.00'),
      row(TODAY, '744.22'),
    ]);

    const current = await service.findCurrent();

    expect(toIsoDate(current.date)).toBe(TODAY);
  });

  it('findCurrent() lanza NotFoundException cuando no hay ninguna fila', async () => {
    const service = await build([]);

    await expect(service.findCurrent()).rejects.toThrow(NotFoundException);
  });

  it('findByDate() con una fecha pasada ignora la tasa futura y devuelve la vigente entonces', async () => {
    const service = await build([
      row(YESTERDAY, '700.00'),
      row(TODAY, '744.22'),
      row(TOMORROW, '750.00'),
    ]);

    const historic = await service.findByDate(
      new Date(`${YESTERDAY}T12:00:00Z`),
    );

    expect(toIsoDate(historic.date)).toBe(YESTERDAY);
    expect(Number(historic.rate)).toBe(700);
  });

  it('findByDate() de hoy no se contamina con la fila de mañana', async () => {
    const service = await build([
      row(TODAY, '744.22'),
      row(TOMORROW, '750.00'),
    ]);

    const historic = await service.findByDate(new Date(`${TODAY}T12:00:00Z`));

    expect(toIsoDate(historic.date)).toBe(TODAY);
    expect(Number(historic.rate)).toBe(744.22);
  });
});

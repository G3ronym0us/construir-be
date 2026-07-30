import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { ExchangeRate } from './exchange-rate.entity';
import { BCVService } from './bcv.service';

const isoDay = (offsetDays: number): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

// La fecha valor del servicio es siempre la de mañana, para que la aserción
// "no la guardó bajo la fecha de hoy" no pueda volverse vacía según el día en
// que se corran los tests. En modo `published`, entre las ~17:00 y medianoche,
// el BCV ya publicó la tasa que entra en vigencia mañana.
const TODAY = isoDay(0);
const TOMORROW = isoDay(1);

describe('ExchangeRatesService.sync', () => {
  let service: ExchangeRatesService;
  let repo: {
    findOne: jest.Mock;
    save: jest.Mock<Promise<ExchangeRate>, [ExchangeRate]>;
    create: jest.Mock;
  };
  let bcvService: { getBCVRate: jest.Mock };

  const PUBLISHED = {
    rate: 744.22,
    effectiveDate: TOMORROW,
    source: 'bcv.org.ve',
    stale: false,
  };

  const storedRate = (date: string, rate: string): ExchangeRate =>
    ({ id: 1, date, rate, source: 'bcv' }) as unknown as ExchangeRate;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn((entity: ExchangeRate) => Promise.resolve(entity)),
      create: jest.fn((dto: Partial<ExchangeRate>) => dto),
    };
    bcvService = { getBCVRate: jest.fn().mockResolvedValue(PUBLISHED) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRatesService,
        { provide: getRepositoryToken(ExchangeRate), useValue: repo },
        { provide: BCVService, useValue: bcvService },
      ],
    }).compile();

    service = module.get(ExchangeRatesService);
  });

  it('guarda bajo la effectiveDate del servicio, no bajo la fecha de hoy', async () => {
    repo.findOne.mockResolvedValue(null);

    await service.sync();

    const saved = repo.save.mock.calls[0][0];
    const savedDate = new Date(saved.date).toISOString().split('T')[0];

    expect(savedDate).toBe(TOMORROW);
    expect(savedDate).not.toBe(TODAY);
    expect(saved.rate).toBe(744.22);
  });

  it('busca la fila existente por la effectiveDate, no por hoy', async () => {
    repo.findOne.mockResolvedValue(null);

    await service.sync();

    const calls = repo.findOne.mock.calls as Array<[{ where: { date: Date } }]>;
    const queriedDate = new Date(calls[0][0].where.date)
      .toISOString()
      .split('T')[0];
    expect(queriedDate).toBe(TOMORROW);
  });

  it('es idempotente: no escribe si ya existe esa fecha con la misma tasa', async () => {
    const existing = storedRate(TOMORROW, '744.22');
    repo.findOne.mockResolvedValue(existing);

    const result = await service.sync();

    expect(repo.save).not.toHaveBeenCalled();
    expect(result).toBe(existing);
  });

  it('actualiza la fila cuando existe esa fecha con otra tasa', async () => {
    repo.findOne.mockResolvedValue(storedRate(TOMORROW, '740.00'));

    const result = await service.sync();

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(result.rate).toBe(744.22);
  });

  it('lanza NotFoundException y no escribe si el servicio no da tasa', async () => {
    bcvService.getBCVRate.mockResolvedValue(null);

    await expect(service.sync()).rejects.toThrow(NotFoundException);
    expect(repo.save).not.toHaveBeenCalled();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExchangeRateTasksService } from './exchange-rate-tasks.service';
import { ExchangeRatesService } from './exchange-rates.service';
import { BCVService } from './bcv.service';
import { ExchangeRate } from './exchange-rate.entity';
import { Product } from '../products/product.entity';
import { IvaType } from '../products/enums/iva-type.enum';

describe('ExchangeRateTasksService.handlePublishedRateDetection', () => {
  let service: ExchangeRateTasksService;
  let exchangeRatesService: { sync: jest.Mock; findLatest: jest.Mock };
  let bcvService: { getBCVRate: jest.Mock };
  let productsRepo: { find: jest.Mock; save: jest.Mock };

  const PUBLISHED = {
    rate: 744.22,
    effectiveDate: '2026-07-30',
    source: 'bcv.org.ve',
    stale: false,
  };

  const makeProduct = (): Product =>
    ({
      id: 1,
      price: 10,
      ivaType: IvaType.NORMAL,
      priceVes: 0,
      ivaVes: 0,
      priceWithIvaVes: 0,
    }) as unknown as Product;

  const storedRate = (date: string | Date, rate: string): ExchangeRate =>
    ({ id: 1, date, rate, source: 'bcv' }) as unknown as ExchangeRate;

  beforeEach(async () => {
    exchangeRatesService = {
      sync: jest.fn(),
      findLatest: jest.fn(),
    };
    bcvService = { getBCVRate: jest.fn().mockResolvedValue(PUBLISHED) };
    productsRepo = {
      find: jest.fn().mockResolvedValue([makeProduct()]),
      save: jest.fn((p) => Promise.resolve(p)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeRateTasksService,
        { provide: ExchangeRatesService, useValue: exchangeRatesService },
        { provide: BCVService, useValue: bcvService },
        { provide: getRepositoryToken(Product), useValue: productsRepo },
      ],
    }).compile();

    service = module.get(ExchangeRateTasksService);
  });

  it('NO recalcula el catálogo cuando la tasa publicada no cambió', async () => {
    exchangeRatesService.findLatest.mockResolvedValue(
      storedRate('2026-07-30', '744.22'),
    );
    // sync() se mockea con éxito a propósito: si el cron dejara de
    // corto-circuitar, llegaría a recalcular y `save` se dispararía. Sin este
    // mock la aserción sobre `save` pasaría por un crash previo, no por la
    // lógica que dice cubrir.
    exchangeRatesService.sync.mockResolvedValue(
      storedRate('2026-07-30', '744.22'),
    );

    await service.handlePublishedRateDetection();

    // Ésta es la aserción que protege el requisito central: recalcular 1380
    // productos en horario comercial solo puede pasar ante un cambio real.
    expect(productsRepo.save).not.toHaveBeenCalled();
    expect(productsRepo.find).not.toHaveBeenCalled();
    expect(exchangeRatesService.sync).not.toHaveBeenCalled();
  });

  it('NO recalcula cuando la fecha valor viene como Date en vez de string', async () => {
    exchangeRatesService.findLatest.mockResolvedValue(
      storedRate(new Date('2026-07-30T00:00:00Z'), '744.22'),
    );
    exchangeRatesService.sync.mockResolvedValue(
      storedRate('2026-07-30', '744.22'),
    );

    await service.handlePublishedRateDetection();

    expect(productsRepo.save).not.toHaveBeenCalled();
    expect(exchangeRatesService.sync).not.toHaveBeenCalled();
  });

  it('SÍ recalcula cuando la tasa cambió', async () => {
    exchangeRatesService.findLatest.mockResolvedValue(
      storedRate('2026-07-29', '740.00'),
    );
    exchangeRatesService.sync.mockResolvedValue(
      storedRate('2026-07-30', '744.22'),
    );

    await service.handlePublishedRateDetection();

    expect(exchangeRatesService.sync).toHaveBeenCalledTimes(1);
    expect(productsRepo.save).toHaveBeenCalledTimes(1);

    const savedProducts = productsRepo.save.mock.calls.map(
      (call: [Product]) => call[0],
    );
    expect(savedProducts[0].priceVes).toBe(7442.2);
    expect(savedProducts[0].priceWithIvaVes).toBe(8632.95);
  });

  it('SÍ recalcula cuando cambia solo la fecha valor', async () => {
    exchangeRatesService.findLatest.mockResolvedValue(
      storedRate('2026-07-29', '744.22'),
    );
    exchangeRatesService.sync.mockResolvedValue(
      storedRate('2026-07-30', '744.22'),
    );

    await service.handlePublishedRateDetection();

    expect(exchangeRatesService.sync).toHaveBeenCalledTimes(1);
    expect(productsRepo.save).toHaveBeenCalled();
  });

  it('SÍ recalcula cuando no hay ninguna tasa guardada', async () => {
    exchangeRatesService.findLatest.mockResolvedValue(null);
    exchangeRatesService.sync.mockResolvedValue(
      storedRate('2026-07-30', '744.22'),
    );

    await service.handlePublishedRateDetection();

    expect(exchangeRatesService.sync).toHaveBeenCalledTimes(1);
    expect(productsRepo.save).toHaveBeenCalled();
  });

  it('si el servicio no responde: no lanza, no escribe y no pisa la tasa guardada', async () => {
    bcvService.getBCVRate.mockResolvedValue(null);

    await expect(
      service.handlePublishedRateDetection(),
    ).resolves.toBeUndefined();

    expect(exchangeRatesService.sync).not.toHaveBeenCalled();
    expect(productsRepo.save).not.toHaveBeenCalled();
  });

  it('si sync falla, el cron no propaga la excepción', async () => {
    exchangeRatesService.findLatest.mockResolvedValue(
      storedRate('2026-07-29', '740.00'),
    );
    exchangeRatesService.sync.mockRejectedValue(new Error('db caída'));

    await expect(
      service.handlePublishedRateDetection(),
    ).resolves.toBeUndefined();

    expect(productsRepo.save).not.toHaveBeenCalled();
  });
});

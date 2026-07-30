import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { BCVService } from './bcv.service';

// Respuesta real del servicio, verificada contra producción el 2026-07-29.
const SERVICE_RESPONSE = {
  currency: 'USD',
  rate: '744.22',
  rateFull: '744.22640000',
  effectiveDate: '2026-07-29',
  observedAt: '2026-07-29T15:44:50.424Z',
  source: 'bcv.org.ve',
  mode: 'published',
  stale: false,
  suspect: false,
};

describe('BCVService', () => {
  let service: BCVService;
  let httpService: { get: jest.Mock };

  const config: Record<string, unknown> = {
    'bcvRates.url': 'https://rates.example.com',
    'bcvRates.apiKey': 'test-key',
    'bcvRates.timeoutMs': 7000,
  };

  beforeEach(async () => {
    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BCVService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
      ],
    }).compile();

    service = module.get(BCVService);
  });

  it('pide la tasa publicada al servicio con la API key y un timeout explícito', async () => {
    httpService.get.mockReturnValue(of({ data: SERVICE_RESPONSE }));

    await service.getBCVRate();

    expect(httpService.get).toHaveBeenCalledWith(
      'https://rates.example.com/v1/rates/current',
      expect.objectContaining({
        params: { currency: 'USD', mode: 'published' },
        headers: { Authorization: 'Bearer test-key' },
        timeout: 7000,
      }),
    );
  });

  it('usa el `rate` truncado y no `rateFull`, y expone la fecha valor', async () => {
    httpService.get.mockReturnValue(of({ data: SERVICE_RESPONSE }));

    const result = await service.getBCVRate();

    expect(result).toEqual({
      rate: 744.22,
      effectiveDate: '2026-07-29',
      source: 'bcv.org.ve',
      stale: false,
    });
    // El centavo de diferencia contra rateFull (744.2264) es deliberado.
    expect(result?.rate).not.toBe(744.23);
  });

  it('cachea la respuesta durante 5 minutos', async () => {
    httpService.get.mockReturnValue(of({ data: SERVICE_RESPONSE }));

    await service.getBCVRate();
    await service.getBCVRate();

    expect(httpService.get).toHaveBeenCalledTimes(1);

    service.clearCache();
    await service.getBCVRate();
    expect(httpService.get).toHaveBeenCalledTimes(2);
  });

  it('devuelve la caché cuando el servicio falla', async () => {
    httpService.get.mockReturnValueOnce(of({ data: SERVICE_RESPONSE }));
    const first = await service.getBCVRate();

    httpService.get.mockReturnValue(throwError(() => new Error('timeout')));
    // Forzamos vencimiento de la caché sin borrarla.
    (service as unknown as { cacheExpiry: number }).cacheExpiry = 0;

    const second = await service.getBCVRate();
    expect(second).toEqual(first);
  });

  it('devuelve null (sin lanzar) cuando falla y no hay caché', async () => {
    httpService.get.mockReturnValue(
      throwError(() => new Error('ECONNREFUSED')),
    );

    await expect(service.getBCVRate()).resolves.toBeNull();
  });

  it('rechaza una respuesta con effectiveDate inválida', async () => {
    httpService.get.mockReturnValue(
      of({ data: { ...SERVICE_RESPONSE, effectiveDate: '29/07/2026' } }),
    );

    await expect(service.getBCVRate()).resolves.toBeNull();
  });

  it('rechaza una respuesta con rate no numérico', async () => {
    httpService.get.mockReturnValue(
      of({ data: { ...SERVICE_RESPONSE, rate: 'n/a' } }),
    );

    await expect(service.getBCVRate()).resolves.toBeNull();
  });

  it('propaga la marca stale del servicio', async () => {
    httpService.get.mockReturnValue(
      of({ data: { ...SERVICE_RESPONSE, stale: true, source: 'dolarapi' } }),
    );

    const result = await service.getBCVRate();

    expect(result?.stale).toBe(true);
    expect(result?.source).toBe('dolarapi');
  });
});

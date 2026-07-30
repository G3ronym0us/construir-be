import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GuestCustomersService } from './guest-customers.service';
import { GuestCustomersController } from './guest-customers.controller';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';

/**
 * El autocompletado del checkout de invitados es público y basta la cédula: se
 * decidió que exigir un segundo dato estorbaba más de lo que protegía, porque
 * el comprador no tiene por qué recordar con qué correo compró la vez pasada.
 *
 * A cambio, el límite de tasa del controlador queda como única contención. Las
 * cédulas venezolanas son secuenciales, así que sin ese límite recorrerlas en
 * orden devolvería los datos de contacto de todos los clientes. Por eso hay una
 * prueba que lo vigila: si alguien lo quita, esto tiene que ponerse en rojo.
 */
describe('GuestCustomersService.findForAutocomplete', () => {
  let service: GuestCustomersService;
  let repo: { findOne: jest.Mock };

  const CLIENTE = {
    id: 1,
    identificationType: IdentificationType.V,
    identificationNumber: '12345678',
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana.perez@example.com',
    phone: '04141234567',
    address: 'Av. Principal, casa 4',
  } as unknown as GuestCustomer;

  beforeEach(async () => {
    repo = { findOne: jest.fn().mockResolvedValue(CLIENTE) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestCustomersService,
        { provide: getRepositoryToken(GuestCustomer), useValue: repo },
      ],
    }).compile();
    service = module.get(GuestCustomersService);
  });

  describe('la identificación alcanza', () => {
    it('devuelve el cliente a partir de la cédula sola', async () => {
      const encontrado = await service.findForAutocomplete(
        IdentificationType.V,
        '12345678',
      );
      expect(encontrado).toBe(CLIENTE);
    });

    it('busca por el par tipo + número, no sólo por el número', async () => {
      await service.findForAutocomplete(IdentificationType.E, '12345678');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          identificationType: IdentificationType.E,
          identificationNumber: '12345678',
        },
      });
    });

    it('devuelve null cuando la identificación no está registrada', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(
        await service.findForAutocomplete(IdentificationType.V, '99999999'),
      ).toBeNull();
    });
  });

  describe('el límite de tasa protege la ruta pública', () => {
    const handler = GuestCustomersController.prototype.searchByIdentification;

    it('mantiene el ThrottlerGuard aplicado', () => {
      const guards = Reflect.getMetadata('__guards__', handler) as unknown[];
      expect(guards).toContain(ThrottlerGuard);
    });

    it('no afloja el tope de consultas por minuto', () => {
      const limite = Reflect.getMetadata('THROTTLER:LIMITdefault', handler);
      const ventana = Reflect.getMetadata('THROTTLER:TTLdefault', handler);

      // Con la cédula sola bastando, este número es lo único que encarece
      // recorrer millones de identificaciones. Subirlo reabre el raspado.
      expect(limite).toBeLessThanOrEqual(5);
      expect(ventana).toBeGreaterThanOrEqual(60000);
    });
  });
});

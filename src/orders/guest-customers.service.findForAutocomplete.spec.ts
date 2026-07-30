import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GuestCustomersService } from './guest-customers.service';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';

/**
 * El autocompletado del checkout de invitados es público (no hay sesión), así
 * que la única barrera es exigir un segundo dato del cliente.
 *
 * Lo que se protege: las cédulas venezolanas son secuenciales. Si bastara la
 * cédula, recorrerlas en orden devolvería nombre, correo, teléfono, domicilio y
 * coordenadas de todos los clientes que hubieran comprado alguna vez.
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
    email: 'Ana.Perez@Example.com',
    phone: '04141234567',
    address: 'Av. Principal, casa 4',
    latitude: 10.5,
    longitude: -66.9,
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

  const buscar = (contacto: { email?: string; phone?: string }) =>
    service.findForAutocomplete(IdentificationType.V, '12345678', contacto);

  describe('sin el segundo dato no devuelve nada', () => {
    it('rechaza la consulta que trae sólo la identificación', async () => {
      expect(await buscar({})).toBeNull();
    });

    it('no consulta siquiera la base cuando falta el segundo dato', async () => {
      await buscar({});
      // Importante: si consultara, el tiempo de respuesta delataría qué
      // identificaciones existen aunque el cuerpo fuera el mismo.
      expect(repo.findOne).not.toHaveBeenCalled();
    });

    it('rechaza un correo en blanco', async () => {
      expect(await buscar({ email: '   ' })).toBeNull();
    });

    it('rechaza un teléfono que no llega a siete dígitos', async () => {
      expect(await buscar({ phone: '0414' })).toBeNull();
    });
  });

  describe('con el segundo dato correcto devuelve el cliente', () => {
    it('acepta el correo, sin distinguir mayúsculas ni espacios', async () => {
      expect(await buscar({ email: '  ana.perez@example.com ' })).toBe(CLIENTE);
    });

    it('acepta el teléfono tal como está registrado', async () => {
      expect(await buscar({ phone: '04141234567' })).toBe(CLIENTE);
    });

    it('acepta el teléfono con prefijo internacional y separadores', async () => {
      expect(await buscar({ phone: '+58 414-123.4567' })).toBe(CLIENTE);
    });

    it('alcanza con que coincida uno de los dos', async () => {
      expect(
        await buscar({ email: 'otro@example.com', phone: '04141234567' }),
      ).toBe(CLIENTE);
    });
  });

  describe('con el segundo dato incorrecto no devuelve nada', () => {
    it('rechaza un correo que no corresponde', async () => {
      expect(await buscar({ email: 'atacante@example.com' })).toBeNull();
    });

    it('rechaza un teléfono que no corresponde', async () => {
      expect(await buscar({ phone: '04249999999' })).toBeNull();
    });
  });

  describe('no funciona como oráculo de identificaciones', () => {
    it('responde igual para una identificación inexistente que para un contacto equivocado', async () => {
      repo.findOne.mockResolvedValue(null);
      const inexistente = await buscar({ email: 'ana.perez@example.com' });

      repo.findOne.mockResolvedValue(CLIENTE);
      const contactoMalo = await buscar({ email: 'atacante@example.com' });

      expect(inexistente).toBeNull();
      expect(contactoMalo).toBeNull();
      expect(inexistente).toEqual(contactoMalo);
    });
  });

  describe('no se puede burlar con valores vacíos', () => {
    it('un correo en blanco no coincide con un cliente sin correo', async () => {
      repo.findOne.mockResolvedValue({
        ...CLIENTE,
        email: '',
        phone: '',
      } as unknown as GuestCustomer);

      // Sin la guarda de valor normalizado no nulo, ambos lados darían `null`
      // y `null === null` devolvería el cliente: el agujero quedaría abierto.
      expect(await buscar({ email: '  ' })).toBeNull();
      expect(await buscar({ phone: '---' })).toBeNull();
    });
  });

  describe('la búsqueda interna por identificación sigue intacta', () => {
    it('findByIdentification no exige segundo dato, porque la usa el alta de la orden', async () => {
      const encontrado = await service.findByIdentification(
        IdentificationType.V,
        '12345678',
      );
      expect(encontrado).toBe(CLIENTE);
    });
  });
});

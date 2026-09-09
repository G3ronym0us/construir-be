import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GuestCustomersService } from './guest-customers.service';
import { GuestCustomersController } from './guest-customers.controller';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';

/**
 * El autocompletado del checkout de invitados es público y antes bastaba la
 * cédula: con el tipo y el número, cualquiera recibía la ficha completa de un
 * comprador —nombre, correo, teléfono, domicilio y hasta las coordenadas GPS—.
 * Como las cédulas venezolanas son secuenciales, recorrerlas en orden era
 * descargarse la base de clientes entera. El límite de tasa sólo encarecía el
 * barrido desde una IP; desde muchas no impedía nada.
 *
 * Estas pruebas fijan el cierre de ese agujero y las cuatro cosas que no hay
 * que romper al tocarlo:
 *
 * 1. Sin el teléfono correcto no sale NADA, por mucho que la cédula exista.
 * 2. "La cédula no existe" y "el teléfono no coincide" responden IGUAL. Si
 *    alguien los distingue, el atacante vuelve a poder enumerar cédulas —
 *    cosechando un sí/no en vez de la ficha, pero enumerándolas.
 * 3. El teléfono se compara NORMALIZADO. Quien escribió "0414-1234567" una vez
 *    y "04141234567" otra tiene que reconocerse a sí mismo.
 * 4. El límite de tasa sigue puesto. Ya no es la única contención, pero es lo
 *    que impide probar un teléfono conocido contra un rango de cédulas.
 */
describe('GuestCustomersService.findForAutocomplete — la cédula ya no basta', () => {
  let service: GuestCustomersService;
  let repo: { findOne: jest.Mock };

  const CLIENTE = {
    id: 1,
    uuid: 'guest-uuid-interno',
    identificationType: IdentificationType.V,
    identificationNumber: '12345678',
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana.perez@example.com',
    phone: '04141234567',
    address: 'Av. Principal, casa 4',
    city: 'Barquisimeto',
    state: 'Lara',
    latitude: 10.0678,
    longitude: -69.3467,
    ordersCount: 3,
    lastOrderDate: new Date('2026-08-01'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2026-08-01'),
  } as unknown as GuestCustomer;

  /** Atajo: consulta la cédula del CLIENTE con el teléfono que se le pase. */
  const buscar = (telefono: unknown) =>
    service.findForAutocomplete(IdentificationType.V, '12345678', telefono);

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

  describe('sin el segundo dato no se entrega nada', () => {
    it('la cédula sola no devuelve al cliente', async () => {
      // El agujero original, tal cual: tipo + número y ya está.
      expect(await buscar(undefined)).toBeNull();
      expect(await buscar('')).toBeNull();
      expect(await buscar(null)).toBeNull();
    });

    it('un teléfono que no coincide no devuelve al cliente', async () => {
      expect(await buscar('04241111111')).toBeNull();
    });

    it('un teléfono basura no cuela por parecerse a "no hay teléfono"', async () => {
      // Las dos partes normalizan a `null`, y `null === null` no puede valer
      // como coincidencia: por eso lo ausente se sustituye por bytes al azar.
      repo.findOne.mockResolvedValue({ ...CLIENTE, phone: 'asdf' });
      expect(await buscar('asdf')).toBeNull();
      expect(await buscar('')).toBeNull();
    });

    it('no acepta un prefijo ni un trozo del teléfono correcto', async () => {
      expect(await buscar('0414123')).toBeNull();
      expect(await buscar('041412345678')).toBeNull();
    });
  });

  describe('los dos rechazos son indistinguibles', () => {
    it('responde exactamente lo mismo si la cédula no existe que si el teléfono falla', async () => {
      repo.findOne.mockResolvedValue(null);
      const cedulaInexistente = await service.findForAutocomplete(
        IdentificationType.V,
        '99999999',
        '04141234567',
      );

      repo.findOne.mockResolvedValue(CLIENTE);
      const telefonoIncorrecto = await buscar('04241111111');

      // Mismo valor, y por tanto mismo cuerpo y mismo 200 en la respuesta HTTP.
      // Cualquier intento de ser más informativo con uno de los dos reabre la
      // enumeración de cédulas.
      expect(cedulaInexistente).toBeNull();
      expect(telefonoIncorrecto).toBeNull();
      expect(cedulaInexistente).toEqual(telefonoIncorrecto);
    });

    it('consulta la base también cuando el teléfono va a fallar', async () => {
      // Si se cortocircuitara —comparar el teléfono antes de ir a la base, o
      // salir en cuanto no hay registro— el tiempo de respuesta delataría qué
      // cédulas existen. El trabajo tiene que ser el mismo en los dos casos.
      await buscar('04241111111');
      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          identificationType: IdentificationType.V,
          identificationNumber: '12345678',
        },
      });

      repo.findOne.mockClear();
      repo.findOne.mockResolvedValue(null);
      await service.findForAutocomplete(
        IdentificationType.V,
        '99999999',
        '04141234567',
      );
      expect(repo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('el teléfono se compara normalizado, no como cadena cruda', () => {
    it('reconoce el mismo móvil escrito de todas las formas de siempre', async () => {
      // Guardado como "04141234567". El cliente no tiene por qué recordar con
      // qué puntuación lo escribió la vez pasada.
      for (const escrito of [
        '04141234567',
        '0414-1234567',
        '0414 123 45 67',
        '0414.123.4567',
        '(0414) 1234567',
        '+58 414 1234567',
        '584141234567',
        '4141234567',
      ]) {
        expect(await buscar(escrito)).not.toBeNull();
      }
    });

    it('reconoce también al revés: guardado con guiones, tecleado sin ellos', async () => {
      repo.findOne.mockResolvedValue({ ...CLIENTE, phone: '0414-123.45.67' });
      expect(await buscar('04141234567')).not.toBeNull();
    });

    it('reconoce los teléfonos viejos que no son móviles venezolanos', async () => {
      // En `guest_customers` hay números cargados antes de que se validara
      // nada, del tipo "+1 (406) 729-6503". Si el único criterio fuera el de
      // móvil venezolano, esos clientes no volverían a autocompletar jamás.
      repo.findOne.mockResolvedValue({
        ...CLIENTE,
        phone: '+1 (406) 729-6503',
      });
      expect(await buscar('+1 (406) 729-6503')).not.toBeNull();
      expect(await buscar('14067296503')).not.toBeNull();
      expect(await buscar('+1 (406) 729-6504')).toBeNull();
    });
  });

  describe('con la cédula y el teléfono correctos sí autocompleta', () => {
    it('devuelve los campos que el formulario de checkout rellena', async () => {
      const ficha = await buscar('0414-1234567');

      expect(ficha).toMatchObject({
        identificationType: IdentificationType.V,
        identificationNumber: '12345678',
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana.perez@example.com',
        phone: '04141234567',
        address: 'Av. Principal, casa 4',
        city: 'Barquisimeto',
        state: 'Lara',
        ordersCount: 3,
      });
    });

    it('no saca los identificadores internos ni las fechas', async () => {
      // La ruta es pública: el `id` correlativo y el `uuid` con el que se mueve
      // el panel de administración no tienen por qué salir de acá.
      const ficha = (await buscar('04141234567')) as unknown as Record<
        string,
        unknown
      >;

      for (const campo of [
        'id',
        'uuid',
        'createdAt',
        'updatedAt',
        'lastOrderDate',
      ]) {
        expect(ficha).not.toHaveProperty(campo);
      }
    });

    it('no reparte las coordenadas GPS del domicilio', async () => {
      // Son el punto exacto de la casa de alguien y la ruta no tiene sesión.
      // La dirección escrita ya autocompleta; el mapa no se usa en este
      // checkout, así que devolverlas no compraba nada.
      const ficha = (await buscar('04141234567')) as unknown as Record<
        string,
        unknown
      >;

      expect(ficha).not.toHaveProperty('latitude');
      expect(ficha).not.toHaveProperty('longitude');
      // Y no es que la ficha de prueba no las tenga: el cliente sí las tiene.
      expect(CLIENTE.latitude).toBeDefined();
      expect(CLIENTE.longitude).toBeDefined();
    });

    it('busca por el par tipo + número, no sólo por el número', async () => {
      await service.findForAutocomplete(
        IdentificationType.E,
        '12345678',
        '04141234567',
      );
      expect(repo.findOne).toHaveBeenCalledWith({
        where: {
          identificationType: IdentificationType.E,
          identificationNumber: '12345678',
        },
      });
    });
  });

  describe('el límite de tasa sigue protegiendo la ruta pública', () => {
    const handler = GuestCustomersController.prototype.searchByIdentification;

    it('mantiene el ThrottlerGuard aplicado', () => {
      const guards = Reflect.getMetadata('__guards__', handler) as unknown[];
      expect(guards).toContain(ThrottlerGuard);
    });

    it('no afloja el tope de consultas por minuto', () => {
      const limite = Reflect.getMetadata('THROTTLER:LIMITdefault', handler);
      const ventana = Reflect.getMetadata('THROTTLER:TTLdefault', handler);

      // Ya no es la única contención, pero sigue siendo lo que impide que
      // alguien que conoce un teléfono lo pruebe contra un rango de cédulas.
      expect(limite).toBeLessThanOrEqual(5);
      expect(ventana).toBeGreaterThanOrEqual(60000);
    });
  });

  describe('el controlador responde igual falte lo que falte', () => {
    /**
     * El servicio se sustituye por uno que SIEMPRE encontraría al cliente. Así
     * lo único que puede hacer que no salga la ficha es el propio controlador,
     * y cualquier atajo suyo se ve.
     */
    const controller = new GuestCustomersController({
      findForAutocomplete: jest.fn().mockResolvedValue(CLIENTE),
    } as unknown as GuestCustomersService);

    const consultar = (
      tipo: unknown,
      numero: unknown,
      telefono: unknown,
    ): Promise<unknown> =>
      controller.searchByIdentification(
        tipo as IdentificationType,
        numero as string,
        telefono as string,
      );

    it('todas las combinaciones con algo ausente dan exactamente la misma respuesta', async () => {
      // La versión anterior de esta prueba miraba un solo caso contra un
      // servicio que devolvía null de todas formas: el nombre prometía una
      // comparación que no hacía. Ahora se comparan todas contra todas.
      const incompletas = [
        [undefined, '12345678', '04141234567'],
        ['', '12345678', '04141234567'],
        [IdentificationType.V, undefined, '04141234567'],
        [IdentificationType.V, '', '04141234567'],
        [IdentificationType.V, '12345678', undefined],
        [IdentificationType.V, '12345678', ''],
        [undefined, undefined, undefined],
      ];

      const respuestas: unknown[] = [];
      for (const [tipo, numero, telefono] of incompletas) {
        respuestas.push(await consultar(tipo, numero, telefono));
      }

      // Ninguna entrega la ficha, aunque el servicio la habría devuelto...
      for (const r of respuestas) expect(r).toBeNull();
      // ...y todas son el MISMO valor, así que no hay nada que distinguir.
      for (const r of respuestas) expect(r).toEqual(respuestas[0]);
    });

    it('con los tres parámetros sí llega al servicio', async () => {
      // La contracara: si el controlador cortara siempre, las aserciones de
      // arriba pasarían sin significar nada.
      expect(
        await consultar(IdentificationType.V, '12345678', '04141234567'),
      ).toBe(CLIENTE);
    });

    it('un tipo de identificación inválido es un 400, no un 500', async () => {
      // `identification_type` es un enum de Postgres: un valor fuera de la
      // lista reventaba la consulta y salía un error del servidor.
      await expect(
        consultar('X', '12345678', '04141234567'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('acepta los cinco tipos que existen', async () => {
      for (const tipo of Object.values(IdentificationType)) {
        expect(await consultar(tipo, '12345678', '04141234567')).toBe(CLIENTE);
      }
    });
  });
});

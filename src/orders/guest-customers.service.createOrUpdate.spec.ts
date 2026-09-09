import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GuestCustomersService } from './guest-customers.service';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';
import { CustomerInfoDto, ShippingAddressDto } from './dto/create-order.dto';

/**
 * Exigir el teléfono en el buscador cerró la enumeración de cédulas, pero no la
 * extracción dirigida: quedaba un rodeo que la reabría entera y que sólo
 * necesitaba la cédula de la víctima, que es secuencial y se adivina.
 *
 *   1. La víctima tiene ficha: su teléfono, su dirección y sus coordenadas GPS.
 *   2. El atacante manda `POST /orders` con la MISMA cédula, un teléfono suyo
 *      y `pickup` — que no lleva dirección de envío, así que el
 *      `if (shippingAddress)` no corría y la dirección de la víctima
 *      sobrevivía intacta bajo el teléfono del atacante.
 *   3. El atacante consulta el buscador con SU teléfono y recibe el domicilio
 *      y las coordenadas de la víctima.
 *
 * Coste del paso 2: un pedido de invitado que se queda esperando un pago que
 * nunca se hace. Ninguno, en la práctica.
 *
 * La regla que lo cierra: la cédula NOMBRA a una persona, el teléfono PRUEBA
 * que quien pide es esa persona. Sin esa prueba la ficha no hereda nada de su
 * ocupante anterior. Estas pruebas fijan las dos mitades: que el rodeo ya no
 * devuelve nada ajeno, y que el cliente legítimo —el que sí prueba su
 * teléfono, aunque lo escriba con otra puntuación— conserva lo suyo.
 */
describe('GuestCustomersService.createOrUpdate — la ficha no se hereda', () => {
  let service: GuestCustomersService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };

  const victima = () =>
    ({
      id: 7,
      identificationType: IdentificationType.V,
      identificationNumber: '30111222',
      firstName: 'Marta',
      lastName: 'Rivas',
      email: 'marta.rivas@example.com',
      phone: '04141239999',
      address: 'Calle Victima 123',
      city: 'Caracas',
      state: 'Miranda',
      zipCode: '1010',
      country: 'Venezuela',
      additionalInfo: 'Portón azul',
      latitude: 10.5,
      longitude: -66.9,
      ordersCount: 4,
    }) as unknown as GuestCustomer;

  const pedidoDe = (telefono: string): CustomerInfoDto =>
    ({
      identificationType: IdentificationType.V,
      identificationNumber: '30111222',
      firstName: 'Atacante',
      lastName: 'Anonimo',
      email: 'atacante@example.com',
      phone: telefono,
    }) as CustomerInfoDto;

  beforeEach(async () => {
    repo = {
      findOne: jest.fn().mockResolvedValue(victima()),
      create: jest.fn((x) => x),
      save: jest.fn((x) => Promise.resolve(x)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestCustomersService,
        { provide: getRepositoryToken(GuestCustomer), useValue: repo },
      ],
    }).compile();
    service = module.get(GuestCustomersService);
  });

  describe('el rodeo por pickup ya no conserva los datos de la víctima', () => {
    it('borra dirección y GPS cuando el teléfono no coincide y el pedido no trae dirección', async () => {
      // Éste es el paso 2 del ataque, tal cual: cédula ajena, teléfono propio,
      // retiro en tienda para no mandar dirección.
      const guardado = await service.createOrUpdate(pedidoDe('04149998877'));

      // `toBeNull` y no `toBeUndefined`, y la diferencia no es cosmética: para
      // TypeORM `undefined` significa "no toques esta columna". La primera
      // versión de este arreglo asignaba `undefined`, estas pruebas pasaban, y
      // contra la base de verdad la dirección de la víctima seguía ahí porque
      // el UPDATE ni mencionaba esas columnas.
      expect(guardado.address).toBeNull();
      expect(guardado.city).toBeNull();
      expect(guardado.state).toBeNull();
      expect(guardado.zipCode).toBeNull();
      expect(guardado.additionalInfo).toBeNull();
      expect(guardado.latitude).toBeNull();
      expect(guardado.longitude).toBeNull();
    });

    it('no le regala al atacante el historial de la víctima', async () => {
      // "4 pedidos anteriores" es de quien los hizo.
      const guardado = await service.createOrUpdate(pedidoDe('04149998877'));
      expect(guardado.ordersCount).toBe(1);
    });

    it('tras el rodeo, el buscador ya no devuelve nada de la víctima', async () => {
      // El paso 3, de punta a punta: se consulta con el teléfono del atacante
      // sobre la ficha tal como quedó.
      const trasElAtaque = await service.createOrUpdate(pedidoDe('04149998877'));
      repo.findOne.mockResolvedValue(trasElAtaque);

      const ficha = await service.findForAutocomplete(
        IdentificationType.V,
        '30111222',
        '04149998877',
      );

      expect(ficha).not.toBeNull();
      expect(ficha!.address).toBeNull();
      expect(ficha!.city).toBeNull();
      expect(ficha!.state).toBeNull();
      // Y lo que sí sale es lo que el propio atacante escribió, no de la víctima.
      expect(ficha!.firstName).toBe('Atacante');
      expect(JSON.stringify(ficha)).not.toContain('Calle Victima 123');
      expect(JSON.stringify(ficha)).not.toContain('Marta');
    });

    it('tampoco cuela con la dirección escrita en otra puntuación del teléfono ajeno', async () => {
      // No basta con parecerse: 0414-123.99.98 no es 04141239999.
      const guardado = await service.createOrUpdate(pedidoDe('0414-123.99.98'));
      expect(guardado.address).toBeNull();
      expect(guardado.latitude).toBeNull();
    });
  });

  describe('el cliente legítimo no pierde nada', () => {
    it('conserva su dirección y su historial cuando el teléfono coincide', async () => {
      const guardado = await service.createOrUpdate(
        pedidoDe('04141239999'), // el teléfono real de la ficha
      );

      expect(guardado.address).toBe('Calle Victima 123');
      expect(guardado.city).toBe('Caracas');
      expect(guardado.latitude).toBe(10.5);
      expect(guardado.ordersCount).toBe(5);
    });

    it('lo reconoce aunque escriba el teléfono de otra forma', async () => {
      // Guardado "04141239999"; ahora lo escribe con prefijo internacional.
      const guardado = await service.createOrUpdate(pedidoDe('+58 414 123 9999'));

      expect(guardado.address).toBe('Calle Victima 123');
      expect(guardado.ordersCount).toBe(5);
    });

    it('el que cambió de número sí actualiza su ficha con la dirección que trae el pedido', async () => {
      // Teléfono nuevo, pero el pedido va a domicilio: la dirección que manda
      // es la suya y manda ella. No se hereda nada, se escribe lo nuevo.
      const nuevaDireccion = {
        address: 'Av. Nueva 45',
        city: 'Barquisimeto',
        state: 'Lara',
        zipCode: '3001',
        country: 'Venezuela',
      } as ShippingAddressDto;

      const guardado = await service.createOrUpdate(
        pedidoDe('04125550000'),
        nuevaDireccion,
      );

      expect(guardado.address).toBe('Av. Nueva 45');
      expect(guardado.city).toBe('Barquisimeto');
      // Y NO se cuela nada de la dirección anterior.
      expect(guardado.additionalInfo).toBeUndefined();
      expect(guardado.latitude).toBeUndefined();
      expect(guardado.longitude).toBeUndefined();
      expect(guardado.address).not.toBe('Calle Victima 123');
    });
  });

  describe('un cliente que no existía se crea igual que siempre', () => {
    it('crea la ficha con lo que trae el pedido', async () => {
      repo.findOne.mockResolvedValue(null);

      const guardado = await service.createOrUpdate(pedidoDe('04125550000'));

      expect(guardado.identificationNumber).toBe('30111222');
      expect(guardado.phone).toBe('04125550000');
      expect(guardado.ordersCount).toBe(1);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GuestCustomersService } from './guest-customers.service';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';
import { CustomerInfoDto, ShippingAddressDto } from './dto/create-order.dto';
import { DeliveryMethod } from './order.entity';

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
      const guardado = await service.createOrUpdate(pedidoDe('04149998877'), undefined, DeliveryMethod.PICKUP);

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
      const guardado = await service.createOrUpdate(pedidoDe('04149998877'), undefined, DeliveryMethod.PICKUP);
      expect(guardado.ordersCount).toBe(1);
    });

    it('tras el rodeo, el buscador ya no devuelve nada de la víctima', async () => {
      // El paso 3, de punta a punta: se consulta con el teléfono del atacante
      // sobre la ficha tal como quedó.
      const trasElAtaque = await service.createOrUpdate(pedidoDe('04149998877'), undefined, DeliveryMethod.PICKUP);
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
      const guardado = await service.createOrUpdate(pedidoDe('0414-123.99.98'), undefined, DeliveryMethod.PICKUP);
      expect(guardado.address).toBeNull();
      expect(guardado.latitude).toBeNull();
    });
  });

  describe('el cliente legítimo no pierde nada', () => {
    it('conserva su dirección y su historial cuando el teléfono coincide', async () => {
      const guardado = await service.createOrUpdate(
        pedidoDe('04141239999'), // el teléfono real de la ficha
        undefined,
        DeliveryMethod.PICKUP,
      );

      expect(guardado.address).toBe('Calle Victima 123');
      expect(guardado.city).toBe('Caracas');
      expect(guardado.latitude).toBe(10.5);
      expect(guardado.ordersCount).toBe(5);
    });

    it('lo reconoce aunque escriba el teléfono de otra forma', async () => {
      // Guardado "04141239999"; ahora lo escribe con prefijo internacional.
      const guardado = await service.createOrUpdate(pedidoDe('+58 414 123 9999'), undefined, DeliveryMethod.PICKUP);

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
        DeliveryMethod.DELIVERY,
      );

      expect(guardado.address).toBe('Av. Nueva 45');
      expect(guardado.city).toBe('Barquisimeto');
      expect(guardado.address).not.toBe('Calle Victima 123');
      // `toBeNull` y NUNCA `toBeUndefined`: son los tres campos opcionales que
      // el pedido no manda, y `undefined` es exactamente lo que dejaba viva la
      // nota y el GPS del domicilio anterior.
      expect(guardado.additionalInfo).toBeNull();
      expect(guardado.latitude).toBeNull();
      expect(guardado.longitude).toBeNull();
    });
  });

  describe('el rodeo por delivery tampoco conserva nada de la víctima', () => {
    /**
     * La variante que se escapó del primer arreglo, y la más barata de las dos
     * para el atacante: una sola petición sin autenticar.
     *
     * Manda `delivery` con una dirección inventada y OMITE los tres campos
     * opcionales. `address/city/state/zipCode` se pisan porque el DTO los
     * exige, pero `additionalInfo`, `latitude` y `longitude` llegaban como
     * `undefined` —"no toques esta columna" para TypeORM— y los de la víctima
     * sobrevivían. La propia respuesta del POST los devolvía.
     */
    const direccionInventada = {
      address: 'Cualquier cosa 1',
      city: 'Nada',
      state: 'Nada',
      zipCode: '0000',
      // A propósito: sin additionalInfo, sin latitude y sin longitude.
    } as ShippingAddressDto;

    it('borra la nota y el GPS que el pedido no manda', async () => {
      const guardado = await service.createOrUpdate(
        pedidoDe('04149998877'),
        direccionInventada,
        DeliveryMethod.DELIVERY,
      );

      expect(guardado.additionalInfo).toBeNull();
      expect(guardado.latitude).toBeNull();
      expect(guardado.longitude).toBeNull();
      // Y lo que sí mandó el pedido, escrito.
      expect(guardado.address).toBe('Cualquier cosa 1');
    });

    it('no deja ni rastro de la víctima en la ficha resultante', async () => {
      const guardado = await service.createOrUpdate(
        pedidoDe('04149998877'),
        direccionInventada,
        DeliveryMethod.DELIVERY,
      );

      // Primero lo que de verdad muerde: `null` explícito. Un `undefined`
      // desaparece al serializar, así que la comprobación sobre el texto de
      // abajo lo daría por bueno — y contra Postgres `undefined` significa que
      // el dato de la víctima sigue en su columna.
      expect(guardado.additionalInfo).toBeNull();
      expect(guardado.latitude).toBeNull();
      expect(guardado.longitude).toBeNull();

      // Y después la red de seguridad, que cubre cualquier campo que alguien
      // añada mañana y olvide borrar.
      const serializada = JSON.stringify(guardado);
      expect(serializada).not.toContain('Calle Victima 123');
      expect(serializada).not.toContain('Portón azul');
      expect(serializada).not.toContain('10.5');
      expect(serializada).not.toContain('-66.9');
      expect(serializada).not.toContain('Marta');
    });

    it('y el buscador tampoco los devuelve después', async () => {
      const trasElAtaque = await service.createOrUpdate(
        pedidoDe('04149998877'),
        direccionInventada,
        DeliveryMethod.DELIVERY,
      );
      repo.findOne.mockResolvedValue(trasElAtaque);

      const ficha = await service.findForAutocomplete(
        IdentificationType.V,
        '30111222',
        '04149998877',
      );

      expect(ficha!.additionalInfo).toBeNull();
      expect(JSON.stringify(ficha)).not.toContain('Portón azul');
      // Ésta hoy NO PRUEBA NADA y no puede fallar: el payload del buscador ya
      // no incluye `latitude` por diseño, así que "10.5" nunca podría salir por
      // aquí. Se deja como red por si algún día se reabre ese campo — pero que
      // esté en verde no dice nada sobre el GPS, lo que lo protege es que
      // `aAutocompletado` no lo copia.
      expect(JSON.stringify(ficha)).not.toContain('10.5');
    });

    it('al cliente legítimo sí le escribe la dirección nueva completa', async () => {
      // Mismo camino, pero probando el teléfono: no hay borrado defensivo, hay
      // reemplazo del domicilio por el que trae el pedido.
      const guardado = await service.createOrUpdate(
        pedidoDe('04141239999'),
        direccionInventada,
        DeliveryMethod.DELIVERY,
      );

      expect(guardado.address).toBe('Cualquier cosa 1');
      expect(guardado.ordersCount).toBe(5);
      // La referencia y el GPS de la casa ANTERIOR no pueden quedar colgando de
      // una dirección nueva: además de fuga, es mandar mal al repartidor.
      expect(guardado.additionalInfo).toBeNull();
      expect(guardado.latitude).toBeNull();
    });
  });

  /**
   * La tabla que faltaba, y la razón por la que el mismo fallo se escapó tres
   * veces seguidas: las pruebas de antes pasaban o bien NINGÚN domicilio, o
   * bien uno COMPLETO. Los dos extremos, nunca el medio — y el medio es
   * justamente donde vive el `undefined` que TypeORM lee como "no toques esta
   * columna".
   *
   * Así que en vez de escribir los escenarios que se me ocurran, se recorre la
   * FORMA del dato: cada campo omitido de uno en uno, todos omitidos a la vez,
   * el objeto vacío, y todo eso con los dos métodos de entrega. En ninguna
   * combinación puede sobrevivir una columna de la víctima.
   */
  describe('ningún domicilio parcial deja sobrevivir un dato de la víctima', () => {
    const CAMPOS = [
      'address',
      'city',
      'state',
      'zipCode',
      'country',
      'additionalInfo',
      'latitude',
      'longitude',
    ] as const;

    const COMPLETO: Record<string, unknown> = {
      address: 'Cualquier cosa 1',
      city: 'Nada',
      state: 'Nada',
      zipCode: '0000',
      country: 'Venezuela',
      additionalInfo: 'sin referencia',
      latitude: 1.1,
      longitude: 2.2,
    };

    /** Lo que la víctima tenía y que no puede sobrevivir en ninguna forma. */
    const RASTROS_DE_LA_VICTIMA = [
      'Calle Victima 123',
      'Caracas',
      'Miranda',
      '1010',
      'Portón azul',
      '10.5',
      '-66.9',
    ];

    const sin = (...omitidos: string[]) => {
      const parcial: Record<string, unknown> = {};
      for (const c of CAMPOS) if (!omitidos.includes(c)) parcial[c] = COMPLETO[c];
      return parcial as unknown as ShippingAddressDto;
    };

    // Cada campo omitido de uno en uno, todos a la vez, y el objeto vacío.
    const casos: Array<[string, ShippingAddressDto]> = [
      ...CAMPOS.map(
        (c) => [`sin ${c}`, sin(c)] as [string, ShippingAddressDto],
      ),
      ['sin ninguno de los ocho', sin(...CAMPOS)],
      ['objeto vacío {}', {} as ShippingAddressDto],
    ];

    for (const metodo of [DeliveryMethod.PICKUP, DeliveryMethod.DELIVERY]) {
      for (const [nombre, domicilio] of casos) {
        it(`${metodo} · ${nombre}`, async () => {
          const guardado = await service.createOrUpdate(
            pedidoDe('04149998877'),
            domicilio,
            metodo,
          );

          // Ninguna columna puede quedarse en `undefined`: eso es exactamente
          // "no toques la columna", o sea el dato de la víctima intacto.
          for (const campo of CAMPOS) {
            const valor = (guardado as unknown as Record<string, unknown>)[campo];
            expect(valor).not.toBeUndefined();
          }

          const serializado = JSON.stringify(guardado);
          for (const rastro of RASTROS_DE_LA_VICTIMA) {
            expect(serializado).not.toContain(rastro);
          }
        });
      }
    }

    it('con pickup la dirección del pedido se ignora por completo', async () => {
      // La raíz de la tercera variante: el DTO no valida `shippingAddress`
      // cuando el método es `pickup`, así que ahí puede venir cualquier cosa.
      // Si el resto del pedido la ignora —no se crea registro de envío—, la
      // ficha tampoco puede hacerle caso.
      const guardado = await service.createOrUpdate(
        pedidoDe('04149998877'),
        { address: 'Colada por pickup' } as ShippingAddressDto,
        DeliveryMethod.PICKUP,
      );

      expect(guardado.address).toBeNull();
      expect(guardado.city).toBeNull();
    });
  });

  describe('un cliente que no existía se crea igual que siempre', () => {
    it('crea la ficha con lo que trae el pedido', async () => {
      repo.findOne.mockResolvedValue(null);

      const guardado = await service.createOrUpdate(pedidoDe('04125550000'), undefined, DeliveryMethod.PICKUP);

      expect(guardado.identificationNumber).toBe('30111222');
      expect(guardado.phone).toBe('04125550000');
      expect(guardado.ordersCount).toBe(1);
    });
  });
});

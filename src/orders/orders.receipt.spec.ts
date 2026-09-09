import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { instanceToPlain } from 'class-transformer';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import { PaymentInfo, PaymentMethod, PaymentStatus } from './payment-info.entity';
import { Cart } from '../cart/cart.entity';
import { Product } from '../products/product.entity';
import { User, UserRole } from '../users/user.entity';
import { S3Service, PRIVATE_PREFIX } from '../products/s3.service';
import { EmailService } from '../email/email.service';
import { DiscountsService } from '../discounts/discounts.service';
import { BanksService } from '../banks/banks.service';
import { GuestCustomersService } from './guest-customers.service';
import { UsersService } from '../users/users.service';
import { ExchangeRatesService } from '../exchange-rates/exchange-rates.service';
import { OrderPricingService } from './order-pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { detectReceiptFileType, MAX_RECEIPT_BYTES } from './receipt-file';

/**
 * Regresión: los comprobantes de pago que suben los clientes —capturas de
 * transferencias y pagos móviles, con nombre, cédula, banco y número de cuenta—
 * se subían al MISMO bucket que las imágenes de producto, con el mismo método
 * neutro `S3Service.uploadFile`, y su URL directa se guardaba en
 * `payment_info.receipt_url` y viajaba dentro de cualquier respuesta que
 * devolviera la orden. El bucket responde 200 sin credenciales (comprobado
 * contra producción), así que esa URL era el documento entero para cualquiera
 * que la tuviera.
 *
 * Y `POST /orders/:uuid/receipt` no tenía ningún guard, ningún límite de tasa,
 * ningún límite de tamaño, y validaba el tipo contra el `mimetype` que manda el
 * propio cliente — que además terminaba dando la extensión de la clave en S3.
 * Acertar un uuid bastaba para escribir lo que fuera en el bucket de producción.
 *
 * Lo que estas pruebas sujetan:
 *  - subir sin cumplir las condiciones se rechaza, y sin tocar S3;
 *  - el tipo se decide por los bytes, no por lo que dice el cliente;
 *  - quien no está autorizado no obtiene el comprobante;
 *  - la orden ya no lleva la URL del comprobante encima;
 *  - las imágenes de producto siguen siendo públicas y con URL directa.
 */
describe('Comprobantes de pago privados', () => {
  const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const WEBP = Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from('WEBP', 'latin1'),
  ]);
  const PDF = Buffer.from('%PDF-1.7\n...', 'latin1');
  const HTML = Buffer.from('<html><script>alert(1)</script>', 'latin1');

  const archivo = (
    buffer: Buffer,
    over: Partial<Express.Multer.File> = {},
  ): Express.Multer.File =>
    ({
      fieldname: 'receipt',
      originalname: 'comprobante.jpg',
      mimetype: 'image/jpeg',
      size: buffer.length,
      buffer,
      ...over,
    }) as Express.Multer.File;

  describe('el tipo del fichero sale de los bytes, no del cliente', () => {
    it('reconoce los formatos que aceptamos', () => {
      expect(detectReceiptFileType(JPEG)).toEqual({
        mimeType: 'image/jpeg',
        extension: 'jpg',
      });
      expect(detectReceiptFileType(PNG)?.extension).toBe('png');
      expect(detectReceiptFileType(WEBP)?.extension).toBe('webp');
      expect(detectReceiptFileType(PDF)?.extension).toBe('pdf');
    });

    it('rechaza un HTML aunque venga diciendo que es image/png', () => {
      // Éste era el agujero: el `mimetype` y el `originalname` los escribe
      // entero el cliente, así que un HTML llamado `x.png` quedaba guardado en
      // un bucket de lectura pública, servido desde el mismo dominio que las
      // imágenes de la tienda.
      expect(detectReceiptFileType(HTML)).toBeNull();
    });

    it('rechaza un fichero vacío', () => {
      expect(detectReceiptFileType(Buffer.alloc(0))).toBeNull();
    });
  });

  describe('la ruta de subida no es barra libre', () => {
    const handler = OrdersController.prototype.uploadReceipt;

    /**
     * El guard ya no se declara en la ruta: es el `APP_GUARD` de toda la
     * aplicación (`app.module.ts`), así que preguntarle al metadato
     * `__guards__` del método ya no dice nada — y declararlo además acá lo
     * haría correr DOS veces, gastando dos peticiones del cupo por cada una
     * real.
     *
     * El cambio no debilita esta ruta, la arregla: el `ThrottlerGuard` de
     * serie que había acá cuenta por `req.ip`, y sin `trust proxy` eso es la
     * IP del proxy para todo el mundo. O sea que estas 5 subidas por minuto se
     * las repartía la tienda entera. El guard global sí identifica al
     * visitante.
     *
     * Lo que se comprueba, entonces, es que el techo de la ruta sigue
     * declarado; que el límite corta de verdad se prueba levantando una
     * aplicación con el guard global en
     * `orders.controller.limiteDeTasa.spec.ts`.
     */
    it('no declara el guard en la ruta: lo aplica el APP_GUARD', () => {
      const guards =
        (Reflect.getMetadata('__guards__', handler) as unknown[]) ?? [];
      expect(guards).not.toContain(ThrottlerGuard);
    });

    it('no afloja el tope de subidas por minuto', () => {
      // Es lo único que encarece recorrer uuids a ciegas: la ruta no puede
      // pedir sesión porque el checkout de invitado no la tiene.
      expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBeLessThanOrEqual(5);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBeGreaterThanOrEqual(60000);
    });

    it('pone un tope de tamaño al fichero, que antes no existía', () => {
      expect(MAX_RECEIPT_BYTES).toBeLessThanOrEqual(5 * 1024 * 1024);
    });

    it('la lectura del comprobante sí exige sesión', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        OrdersController.prototype.getReceipt,
      ) as unknown[];
      expect(guards).toContain(JwtAuthGuard);
    });
  });

  describe('la orden ya no lleva encima la URL del comprobante', () => {
    it('serializa hasReceipt y esconde receiptUrl y receiptKey', () => {
      const pago = new PaymentInfo();
      pago.method = PaymentMethod.PAGOMOVIL;
      pago.status = PaymentStatus.PENDING;
      pago.cedula = 'V-12345678';
      pago.receiptUrl =
        'https://congress-marketing.s3.us-east-2.amazonaws.com/receipts/a.png';
      pago.receiptKey = 'private/receipts/a.png';

      const plano = instanceToPlain(pago);

      expect(plano.hasReceipt).toBe(true);
      expect(plano.receiptUrl).toBeUndefined();
      expect(plano.receiptKey).toBeUndefined();
    });

    it('hasReceipt es false cuando no hay comprobante', () => {
      const pago = new PaymentInfo();
      expect(instanceToPlain(pago).hasReceipt).toBe(false);
    });
  });

  describe('S3Service distingue lo público de lo privado', () => {
    let s3: S3Service;
    let enviados: any[];

    beforeEach(() => {
      s3 = new S3Service({
        region: 'us-east-2',
        accessKeyId: 'k',
        secretAccessKey: 's',
        s3BucketName: 'congress-marketing',
      } as any);
      enviados = [];
      // Se le pisa sólo el `send` al cliente real: nada sale a la red, pero el
      // cliente sigue siendo un S3Client de verdad, que es lo que el firmador
      // de URL necesita para poder firmar sin conexión.
      jest
        .spyOn((s3 as any).s3Client, 'send')
        .mockImplementation(async (cmd: any) => {
          enviados.push(cmd.input);
          return {};
        });
    });

    it('las imágenes de producto siguen siendo públicas y con URL directa', async () => {
      const { url, key } = await s3.uploadPublicFile(archivo(JPEG), 'products');

      expect(key.startsWith('products/')).toBe(true);
      expect(key.startsWith(`${PRIVATE_PREFIX}/`)).toBe(false);
      expect(url).toBe(
        `https://congress-marketing.s3.us-east-2.amazonaws.com/${key}`,
      );
    });

    it('un comprobante va bajo private/ y no devuelve ninguna URL', async () => {
      const subido = await s3.uploadPrivateFile(
        archivo(PNG),
        'receipts',
        'receipts/abc.png',
        'image/png',
      );

      expect(subido.key).toBe(`${PRIVATE_PREFIX}/receipts/abc.png`);
      // Si esto dejara de ser cierto, volvería a haber una URL permanente que
      // guardar en la base y mandar al navegador.
      expect((subido as unknown as Record<string, unknown>).url).toBeUndefined();
    });

    it('el enlace firmado caduca y no es la URL directa del bucket', async () => {
      const { url, expiresIn } = await s3.getSignedDownloadUrl(
        'private/receipts/abc.png',
        { expiresIn: 300 },
      );

      expect(expiresIn).toBe(300);
      expect(url).toContain('X-Amz-Signature=');
      expect(url).toContain('X-Amz-Expires=300');
    });
  });

  describe('reglas de servicio y de controlador', () => {
    let controller: OrdersController;
    let service: OrdersService;
    let orderRepository: { findOne: jest.Mock; save: jest.Mock };
    let paymentInfoRepository: { save: jest.Mock };
    let s3: {
      uploadPrivateFile: jest.Mock;
      uploadPublicFile: jest.Mock;
      getSignedDownloadUrl: jest.Mock;
      deleteFile: jest.Mock;
    };

    const orden = (over: Partial<Order> = {}, pago: Partial<PaymentInfo> = {}): Order => {
      const paymentInfo = Object.assign(new PaymentInfo(), {
        id: 1,
        method: PaymentMethod.PAGOMOVIL,
        status: PaymentStatus.PENDING,
        receiptUrl: null,
        receiptKey: null,
        ...pago,
      });
      return {
        id: 1,
        uuid: 'uuid-orden',
        orderNumber: '1042',
        status: OrderStatus.ON_HOLD,
        userId: null,
        paymentInfo,
        ...over,
      } as Order;
    };

    beforeEach(async () => {
      orderRepository = {
        findOne: jest.fn(),
        save: jest.fn(async (o) => o),
      };
      paymentInfoRepository = { save: jest.fn(async (p) => p) };
      s3 = {
        uploadPrivateFile: jest.fn(async () => ({
          key: 'private/receipts/nuevo.png',
        })),
        uploadPublicFile: jest.fn(),
        getSignedDownloadUrl: jest.fn(async () => ({
          url: 'https://firmado.example/x?X-Amz-Signature=abc',
          expiresIn: 300,
        })),
        deleteFile: jest.fn(async () => undefined),
      };

      const noop = {};
      const modulo: TestingModule = await Test.createTestingModule({
        // El ThrottlerGuard del endpoint de subida se instancia con el módulo,
        // así que sin esto el controlador no se puede construir.
        imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])],
        controllers: [OrdersController],
        providers: [
          OrdersService,
          { provide: getRepositoryToken(Order), useValue: orderRepository },
          { provide: getRepositoryToken(OrderItem), useValue: noop },
          { provide: getRepositoryToken(ShippingAddress), useValue: noop },
          {
            provide: getRepositoryToken(PaymentInfo),
            useValue: paymentInfoRepository,
          },
          { provide: getRepositoryToken(Cart), useValue: noop },
          { provide: getRepositoryToken(Product), useValue: noop },
          { provide: getRepositoryToken(User), useValue: noop },
          { provide: EmailService, useValue: noop },
          { provide: DiscountsService, useValue: noop },
          { provide: BanksService, useValue: noop },
          { provide: GuestCustomersService, useValue: noop },
          { provide: UsersService, useValue: noop },
          { provide: ExchangeRatesService, useValue: noop },
          { provide: OrderPricingService, useValue: noop },
          { provide: S3Service, useValue: s3 },
        ],
      }).compile();

      controller = modulo.get(OrdersController);
      service = modulo.get(OrdersService);
    });

    describe('subir un comprobante', () => {
      it('rechaza un fichero que no es de los tipos aceptados, sin tocar S3', async () => {
        await expect(
          controller.uploadReceipt('uuid-orden', archivo(HTML)),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(s3.uploadPrivateFile).not.toHaveBeenCalled();
      });

      it('rechaza un uuid que no existe sin dejar nada en el bucket', async () => {
        orderRepository.findOne.mockResolvedValue(null);

        await expect(
          controller.uploadReceipt('uuid-inventado', archivo(JPEG)),
        ).rejects.toBeInstanceOf(NotFoundException);

        expect(s3.uploadPrivateFile).not.toHaveBeenCalled();
      });

      it('no permite sustituir un comprobante ya verificado', async () => {
        orderRepository.findOne.mockResolvedValue(
          orden({}, { status: PaymentStatus.VERIFIED, receiptKey: 'private/receipts/viejo.png' }),
        );

        await expect(
          controller.uploadReceipt('uuid-orden', archivo(JPEG)),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(s3.uploadPrivateFile).not.toHaveBeenCalled();
        expect(s3.deleteFile).not.toHaveBeenCalled();
      });

      it('no acepta comprobantes en una orden cancelada', async () => {
        orderRepository.findOne.mockResolvedValue(
          orden({ status: OrderStatus.CANCELLED }),
        );

        await expect(
          controller.uploadReceipt('uuid-orden', archivo(JPEG)),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(s3.uploadPrivateFile).not.toHaveBeenCalled();
      });

      it('sí acepta reemplazar un comprobante rechazado, y borra el anterior', async () => {
        orderRepository.findOne.mockResolvedValue(
          orden(
            {},
            {
              status: PaymentStatus.REJECTED,
              receiptKey: 'private/receipts/viejo.png',
            },
          ),
        );

        const resultado = await controller.uploadReceipt(
          'uuid-orden',
          archivo(JPEG),
        );

        expect(s3.uploadPrivateFile).toHaveBeenCalled();
        expect(s3.deleteFile).toHaveBeenCalledWith('private/receipts/viejo.png');
        expect(resultado.paymentInfo.receiptKey).toBe('private/receipts/nuevo.png');
        // La URL pública no se vuelve a escribir jamás.
        expect(resultado.paymentInfo.receiptUrl).toBeNull();
        expect(resultado.paymentInfo.status).toBe(PaymentStatus.PENDING);
      });

      it('guarda la extensión que dicen los bytes, no la del nombre que manda el cliente', async () => {
        orderRepository.findOne.mockResolvedValue(orden());

        await controller.uploadReceipt(
          'uuid-orden',
          archivo(PDF, { originalname: 'factura.html', mimetype: 'text/html' }),
        );

        const [, carpeta, clave, contentType] =
          s3.uploadPrivateFile.mock.calls[0];
        expect(carpeta).toBe('receipts');
        expect(clave).toMatch(/^receipts\/[0-9a-f-]+\.pdf$/);
        expect(contentType).toBe('application/pdf');
      });
    });

    describe('ver un comprobante', () => {
      it('un cliente que no es dueño de la orden no lo obtiene', async () => {
        orderRepository.findOne.mockResolvedValue(
          orden({ userId: 7 }, { receiptKey: 'private/receipts/x.png' }),
        );

        await expect(
          service.getReceiptKeyForViewer('uuid-orden', {
            userId: 99,
            isAdmin: false,
          }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
        expect(s3.getSignedDownloadUrl).not.toHaveBeenCalled();
      });

      it('una orden de invitado no se le entrega a ningún cliente logueado', async () => {
        // El invitado no tiene sesión, así que `userId` es null: sin esta
        // comprobación, cualquier usuario registrado con el uuid a mano se
        // llevaba el comprobante de un pedido que no es suyo.
        orderRepository.findOne.mockResolvedValue(
          orden({ userId: null }, { receiptKey: 'private/receipts/x.png' }),
        );

        await expect(
          service.getReceiptKeyForViewer('uuid-orden', {
            userId: 42,
            isAdmin: false,
          }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      });

      it('el admin obtiene un enlace firmado y temporal', async () => {
        orderRepository.findOne.mockResolvedValue(
          orden({ userId: null }, { receiptKey: 'private/receipts/x.png' }),
        );

        const respuesta = await controller.getReceipt(
          { user: { userId: 1, role: UserRole.ADMIN } },
          'uuid-orden',
        );

        expect(respuesta.url).toContain('X-Amz-Signature=');
        expect(respuesta.expiresIn).toBe(300);
        expect(s3.getSignedDownloadUrl).toHaveBeenCalledWith(
          'private/receipts/x.png',
          expect.objectContaining({ disposition: 'inline' }),
        );
      });

      it('el order_admin también, porque es quien verifica los pagos', async () => {
        orderRepository.findOne.mockResolvedValue(
          orden({ userId: null }, { receiptKey: 'private/receipts/x.png' }),
        );

        await expect(
          controller.getReceipt(
            { user: { userId: 2, role: UserRole.ORDER_ADMIN } },
            'uuid-orden',
          ),
        ).resolves.toEqual(expect.objectContaining({ expiresIn: 300 }));
      });

      it('el dueño registrado de la orden puede ver el suyo', async () => {
        orderRepository.findOne.mockResolvedValue(
          orden({ userId: 42 }, { receiptKey: 'private/receipts/x.png' }),
        );

        await expect(
          service.getReceiptKeyForViewer('uuid-orden', {
            userId: 42,
            isAdmin: false,
          }),
        ).resolves.toEqual(
          expect.objectContaining({ receiptKey: 'private/receipts/x.png' }),
        );
      });

      it('firma con nombre de archivo cuando se pide la descarga', async () => {
        orderRepository.findOne.mockResolvedValue(
          orden({ userId: null }, { receiptKey: 'private/receipts/x.pdf' }),
        );

        await controller.getReceipt(
          { user: { userId: 1, role: UserRole.ADMIN } },
          'uuid-orden',
          '1',
        );

        expect(s3.getSignedDownloadUrl).toHaveBeenCalledWith(
          'private/receipts/x.pdf',
          expect.objectContaining({
            disposition: 'attachment',
            filename: 'comprobante-1042.pdf',
          }),
        );
      });

      it('una orden sin comprobante devuelve 404, no un enlace vacío', async () => {
        orderRepository.findOne.mockResolvedValue(orden({ userId: null }));

        await expect(
          service.getReceiptKeyForViewer('uuid-orden', {
            userId: 1,
            isAdmin: true,
          }),
        ).rejects.toBeInstanceOf(NotFoundException);
      });
    });
  });
});

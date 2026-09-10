import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailPayloadBuilder } from './payload.builder';
import { Order, OrderStatus, DeliveryMethod } from '../orders/order.entity';
import { PaymentMethod, PaymentStatus } from '../orders/payment-info.entity';

const CONFIG: Record<string, string> = {
  'app.frontendUrl': 'https://constru-ir.com',
  'app.url': 'https://api.constru-ir.com',
  'app.storeName': 'Construir',
  'app.storeAddress': 'Av. Bolívar 123',
  'app.storeCity': 'Ciudad Bolívar',
  'app.storeHours': 'Lunes a Viernes 8-5',
  'app.storePhone': '+58 285 632 0178',
  'app.storeEmail': 'info@constru-ir.com',
  'app.storeMapUrl': 'https://maps.example/1',
  'app.storeWhatsappUrl': 'https://wa.me/584120000000',
  'app.storeRif': 'J-12345678-9',
  'email.from': '"Construir" <no-reply@constru-ir.com>',
  'email.adminNotificationEmail': 'admin@constru-ir.com',
};

const makeOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 35,
    // El fixture del brief no lo trae, pero `sendAdminNewOrder` arma
    // `adminUrl` con `order.uuid`: sin este campo el enlace queda con un
    // "undefined" literal, que es justo lo que `noQuedanHuecos` detecta.
    uuid: 'a63f9f0e-3f8a-4b8b-9b1e-8a2f6c9d4e11',
    orderNumber: 'ORD-MS92XZW4-ASXE',
    status: OrderStatus.ON_HOLD,
    deliveryMethod: DeliveryMethod.PICKUP,
    createdAt: new Date('2026-07-31T15:10:56.000Z'),
    subtotal: 65.0,
    tax: 10.4,
    shipping: 0,
    discountAmount: 0,
    discountCode: null,
    total: 75.4,
    exchangeRate: 481.22,
    exchangeRateDate: '2026-04-19',
    subtotalVes: 31279.3,
    taxVes: 5004.69,
    discountAmountVes: null,
    totalVes: 36283.99,
    guestEmail: 'carlosvas@gmail.com',
    user: null,
    guestCustomer: null,
    shippingAddress: null,
    paymentInfo: {
      method: PaymentMethod.PAGOMOVIL,
      status: PaymentStatus.PENDING,
      referenceCode: '998877',
    },
    items: [
      {
        productName: 'TIJERA PODAR MEDIAN 3501-240',
        productSku: '29346',
        quantity: 1,
        price: 27.84,
        priceVes: 13396.16,
        subtotal: 27.84,
        subtotalVes: 13396.16,
        base: 24.0,
        iva: 3.84,
        product: { ivaType: 0 },
      },
    ],
    ...overrides,
  }) as unknown as Order;

describe('EmailService — payload de las plantillas', () => {
  let service: EmailService;
  let enviados: { to: string; subject: string; html: string }[];

  beforeEach(async () => {
    enviados = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        EmailPayloadBuilder,
        {
          provide: ConfigService,
          useValue: { get: (clave: string) => CONFIG[clave] },
        },
      ],
    }).compile();

    service = module.get(EmailService);

    // Se intercepta el envío: interesa el HTML, no el SMTP. `as any` (no
    // `as never`) porque con `never` TypeScript infiere la firma del método
    // espiado como `(...args: never) => never`, y ningún `mockImplementation`
    // real —que devuelve `Promise<void>`— es asignable a `never`.
    jest
      .spyOn(service as any, 'sendEmail')
      .mockImplementation((to: string, subject: string, html: string) => {
        enviados.push({ to, subject, html });
      });
  });

  const noQuedanHuecos = (html: string) => {
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('[object Object]');
  };

  it('sendOrderConfirmation compone la plantilla sin huecos', async () => {
    await service.sendOrderConfirmation(makeOrder());

    expect(enviados).toHaveLength(1);
    expect(enviados[0].to).toBe('carlosvas@gmail.com');
    expect(enviados[0].subject).toBeTruthy();
    noQuedanHuecos(enviados[0].html);
  });

  it('muestra el bolívar como protagonista y el dólar de referencia', async () => {
    await service.sendOrderConfirmation(makeOrder());

    const html = enviados[0].html;
    expect(html).toContain('36.283,99');
    expect(html).toContain('75.40');
  });

  it('muestra la tasa con su fecha, no con la del pedido', async () => {
    await service.sendOrderConfirmation(makeOrder());

    expect(enviados[0].html).toContain('481,22');
  });

  // Un pedido facturado sin tasa disponible no tiene montos en bolívares.
  // Handlebars nunca renderiza `null` como el texto "null" (lo hace como
  // cadena vacía), así que 'Bs. null' o 'Bs. ,' nunca pueden aparecer y una
  // aserción que los busque no puede fallar. El patrón real que deja un
  // monto ausente sin condicional es el rótulo pegado al cierre de la
  // etiqueta: 'Bs. <' o 'BCV <'.
  it('no imprime bloques vacíos cuando no hubo tasa', async () => {
    await service.sendOrderConfirmation(
      makeOrder({
        exchangeRate: null,
        exchangeRateDate: null,
        subtotalVes: null,
        taxVes: null,
        totalVes: null,
      }),
    );

    const html = enviados[0].html;
    expect(html).not.toContain('Bs. <');
    expect(html).not.toContain('BCV <');
    noQuedanHuecos(html);
  });

  // Regresión del hallazgo real: `itemsGrossTotalVes` sumaba
  // `quantity * Number(item.priceVes)`, y `Number(null)` da `0`. Con
  // descuento (que es lo que hace visible la fila "Subtotal (con IVA)") y un
  // renglón sin tasa, la suma daba 0 y `formatVes(0)` devuelve '0,00' -- un
  // valor "verdadero" que el `{{#if itemsGrossTotalVes}}` de la plantilla no
  // filtra. El correo salía con "Subtotal (con IVA)   Bs. 0,00", afirmando un
  // monto falso. Sin descuento la fila ni se pinta, así que el bug sólo se ve
  // con las dos condiciones juntas.
  it('no muestra "Bs. 0,00" cuando hay descuento y algún renglón no tiene tasa en bolívares', async () => {
    await service.sendOrderConfirmation(
      makeOrder({
        discountAmount: 5,
        discountAmountVes: null,
        items: [
          {
            productName: 'TIJERA PODAR MEDIAN 3501-240',
            productSku: '29346',
            quantity: 1,
            price: 27.84,
            priceVes: null,
            subtotal: 27.84,
            subtotalVes: null,
            base: 24.0,
            iva: 3.84,
            product: { ivaType: 0 },
          },
        ] as unknown as Order['items'],
      }),
    );

    const html = enviados[0].html;
    expect(html).toContain('Subtotal (con IVA)');
    expect(html).not.toContain('Bs. 0,00');
  });

  it('incluye el enlace de seguimiento del pedido', async () => {
    await service.sendOrderConfirmation(makeOrder());

    expect(enviados[0].html).toContain(
      'https://constru-ir.com/seguimiento/ORD-MS92XZW4-ASXE',
    );
  });

  // Regresión: el pie de página lee `storeAddress` como variable suelta, no
  // `store.address`. Si `buildCommon()` deja de exponer el alias plano, el
  // pie vuelve a salir vacío en los cuatro correos sin que ningún otro test
  // lo note (Handlebars no estricto renderiza la variable ausente como '').
  it('no deja vacío el pie de página con los datos de la tienda', async () => {
    await service.sendOrderConfirmation(makeOrder());

    expect(enviados[0].html).toContain(CONFIG['app.storeAddress']);
  });

  it('sendPaymentConfirmed compone la plantilla sin huecos', async () => {
    await service.sendPaymentConfirmed(makeOrder());

    expect(enviados).toHaveLength(1);
    noQuedanHuecos(enviados[0].html);
  });

  // Mismo patrón que 'no imprime bloques vacíos cuando no hubo tasa' de
  // sendOrderConfirmation: el bloque "Total pagado" imprimía
  // 'Bs. {{totalVes}}' y '· BCV {{exchangeRate}}' sin condicional.
  it('sendPaymentConfirmed no imprime bloques vacíos cuando no hubo tasa', async () => {
    await service.sendPaymentConfirmed(
      makeOrder({ exchangeRate: null, exchangeRateDate: null, totalVes: null }),
    );

    const html = enviados[0].html;
    expect(html).not.toContain('Bs. <');
    expect(html).not.toContain('BCV <');
    noQuedanHuecos(html);
  });

  it('sendOrderShipped compone la plantilla sin huecos', async () => {
    await service.sendOrderShipped(makeOrder());

    expect(enviados).toHaveLength(1);
    noQuedanHuecos(enviados[0].html);
  });

  it('sendAdminNewOrder va al correo del admin y no al del cliente', async () => {
    await service.sendAdminNewOrder(makeOrder());

    expect(enviados).toHaveLength(1);
    expect(enviados[0].to).toBe('admin@constru-ir.com');
    noQuedanHuecos(enviados[0].html);
  });

  // Mismo patrón, mismo bloque "Total", en el correo interno de pedido
  // nuevo.
  it('sendAdminNewOrder no imprime bloques vacíos cuando no hubo tasa', async () => {
    await service.sendAdminNewOrder(
      makeOrder({ exchangeRate: null, exchangeRateDate: null, totalVes: null }),
    );

    const html = enviados[0].html;
    expect(html).not.toContain('Bs. <');
    expect(html).not.toContain('BCV <');
    noQuedanHuecos(html);
  });

  /**
   * El correo de pedido liberado. Se comprueba lo que el cliente tiene que
   * poder leer: por qué se anuló, cuántas horas pasaron y que puede volver a
   * pedirlo. Sin el `releaseHours` en el HTML, el aviso dice «pasó el plazo»
   * sin decir cuál, que es justo la pregunta que el cliente se hace.
   */
  it('sendOrderReleased compone la plantilla sin huecos y cuenta el plazo', async () => {
    await service.sendOrderReleased(makeOrder(), 3);

    expect(enviados).toHaveLength(1);
    expect(enviados[0].to).toBe('carlosvas@gmail.com');
    expect(enviados[0].subject).toContain('ORD-MS92XZW4-ASXE');
    noQuedanHuecos(enviados[0].html);
    expect(enviados[0].html).toContain('3 horas');
    expect(enviados[0].html).toContain('https://constru-ir.com/productos');
  });

  it('el plazo que sale en el correo es el que se le pasó, no uno fijo', async () => {
    await service.sendOrderReleased(makeOrder(), 8);

    expect(enviados[0].html).toContain('8 horas');
    expect(enviados[0].html).not.toContain('3 horas');
  });

  /** Sin destinatario no hay correo que mandar, y tampoco excepción. */
  it('sendOrderReleased no envía nada si el pedido no tiene correo', async () => {
    await service.sendOrderReleased(
      makeOrder({ guestEmail: null, user: null }),
      3,
    );

    expect(enviados).toHaveLength(0);
  });

  /**
   * El correo del cliente Zelle. Es el que no puede acusarle de no haber
   * pagado: la tienda no publica esos datos, se los manda un operador por
   * WhatsApp, y la pantalla del checkout le dijo que esperara. Si acaba
   * cancelándose, el texto tiene que reconocer de quién era la pelota.
   */
  describe('sendOrderReleased cuando el cliente esperaba nuestros datos', () => {
    const zelle = () =>
      makeOrder({
        paymentInfo: {
          method: PaymentMethod.ZELLE,
          status: PaymentStatus.PENDING,
        },
      } as unknown as Partial<Order>);

    it('no le dice al cliente que no pagó', async () => {
      await service.sendOrderReleased(zelle(), 18, true);

      const { html, subject } = enviados[0];
      noQuedanHuecos(html);
      // Ni en el asunto ni en la franja superior aparece la acusación.
      expect(subject).not.toContain('por falta de pago');
      expect(html).not.toContain('sin recibir el pago');
      expect(html).not.toContain('no recibimos ni el comprobante');
    });

    it('reconoce que estaba esperando datos nuestros', async () => {
      await service.sendOrderReleased(zelle(), 18, true);

      const { html, subject } = enviados[0];
      expect(subject).toContain('esperabas nuestros datos');
      expect(html).toContain('Zelle');
      expect(html).toContain('la demora es nuestra');
      // Y le ofrece retomarlo, no rehacerlo a ciegas.
      expect(html).toContain('Retomar mi pedido por WhatsApp');
    });

    /**
     * El contraste: sin la bandera, el correo de siempre. Sin esto, una
     * plantilla que dijera lo de Zelle a todo el mundo pasaría lo de arriba.
     */
    it('sin la bandera manda el texto normal de falta de pago', async () => {
      await service.sendOrderReleased(makeOrder(), 3, false);

      const { html, subject } = enviados[0];
      expect(subject).toContain('por falta de pago');
      expect(html).toContain('no recibimos ni el comprobante');
      expect(html).not.toContain('la demora es nuestra');
      expect(html).toContain('Volver al catálogo');
    });

    /** Y por omisión se comporta como el correo normal. */
    it('la bandera es opcional y por defecto es el texto normal', async () => {
      await service.sendOrderReleased(makeOrder(), 3);

      expect(enviados[0].subject).toContain('por falta de pago');
    });
  });
});

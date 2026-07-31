import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Order, DeliveryMethod } from '../orders/order.entity';
import { PaymentMethod } from '../orders/payment-info.entity';
import { round2 } from '../products/iva.util';
import { IVA_RATES } from '../products/enums/iva-type.enum';
import { EmailPayloadBuilder } from './payload.builder';
import { formatVes } from './money.util';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  /**
   * Destinatario de los avisos al admin, o `null` si no está configurado.
   *
   * Sin `ADMIN_NOTIFICATION_EMAIL` los avisos de pedido nuevo y de pedido
   * anulado no se envían. Eso antes ocurría en silencio —un `return` sin más—
   * así que una tienda podía estar sin recibir aviso de ningún pedido y no
   * había nada que lo delatara. El aviso en el log es la única señal posible:
   * fallar el arranque por esto dejaría la tienda sin vender.
   */
  private resolveAdminEmail(motivo: string): string | null {
    const adminEmail = this.configService.get<string>(
      'email.adminNotificationEmail',
    );

    if (!adminEmail) {
      this.logger.warn(
        `ADMIN_NOTIFICATION_EMAIL no está configurado: no se envió el aviso de ${motivo}.`,
      );
      return null;
    }

    return adminEmail;
  }

  constructor(
    private configService: ConfigService,
    private readonly payloads: EmailPayloadBuilder,
  ) {
    const port = this.configService.get('email.port') || 587;
    const isSecure = port === 465; // 465 usa SSL, 587 usa TLS

    this.transporter = nodemailer.createTransport({
      host: this.configService.get('email.host') || 'smtp.gmail.com',
      port: port,
      secure: isSecure,
      auth: {
        user: this.configService.get('email.user'),
        pass: this.configService.get('email.password'),
      },
    });

    this.registerTemplateHelpers();
  }

  /**
   * Registra los parciales y el helper que usan las plantillas.
   *
   * Va en el constructor y no en cada envío: `registerPartial` es global de
   * Handlebars, y hacerlo por correo relee del disco en cada envío sin ninguna
   * ganancia.
   *
   * `concat` es el único helper que las plantillas necesitan — lo usan para
   * armar textos como `eyebrow="Pedido {{orderNumber}}"`. Handlebars pasa su
   * propio objeto de opciones como último argumento, por eso se descarta.
   */
  private registerTemplateHelpers(): void {
    const dir = path.join(__dirname, 'templates', 'partials');

    for (const file of fs.readdirSync(dir)) {
      handlebars.registerPartial(
        path.basename(file, '.hbs'),
        fs.readFileSync(path.join(dir, file), 'utf-8'),
      );
    }

    handlebars.registerHelper('concat', (...args: unknown[]) =>
      args.slice(0, -1).join(''),
    );
  }

  private async loadTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(
      __dirname,
      'templates',
      `${templateName}.hbs`,
    );
    return fs.readFileSync(templatePath, 'utf-8');
  }

  /**
   * Compone el HTML de una plantilla, o `null` si algo falla.
   *
   * Un correo es una notificación, no parte de la transacción: varios envíos
   * ocurren después de escrituras que ya no se pueden deshacer. Una plantilla
   * que falta o que no compila tiene que quedar en el log, no propagar hacia
   * una anulación que ya devolvió inventario.
   */
  private async render(
    templateName: string,
    payload: Record<string, unknown>,
  ): Promise<string | null> {
    try {
      const source = await this.loadTemplate(templateName);
      return handlebars.compile(source)(payload);
    } catch (error) {
      this.logger.error(
        `No se pudo componer la plantilla "${templateName}": ${error}`,
      );
      return null;
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from:
          this.configService.get('email.from') ||
          '"Construir" <noreply@construir.com>',
        to,
        subject,
        html,
      });
      console.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      console.error('Error sending email:', error);
      // No lanzamos error para no bloquear el flujo
    }
  }

  /**
   * Nombre para saludar al cliente en el cuerpo del correo.
   *
   * Prioriza los datos de envío -- son los que el cliente tecleó para ESTE
   * pedido -- y cae al nombre de la cuenta cuando no hay dirección (retiro en
   * tienda). 'Cliente' es el último recurso para invitados sin nombre.
   */
  private customerName(order: Order): string {
    return (
      order.shippingAddress?.firstName || order.user?.firstName || 'Cliente'
    );
  }

  async sendOrderConfirmation(order: Order): Promise<void> {
    const isPickup = order.deliveryMethod === 'pickup';

    // Monto bruto (con IVA) de todos los renglones, en bolívares -- es la que
    // muestra la plantilla; el dólar quedó sólo como referencia en el total
    // final. No existe persistido en la orden -- `order.subtotal` es la BASE
    // ya neta del descuento (ver docs/pricing-iva.md) -- así que se recalcula
    // acá con los mismos ítems que arma el correo, para que "Subtotal (con
    // IVA)" coincida exactamente con la suma de los renglones que el cliente
    // ve arriba.
    //
    // `priceVes` es `number | null` -- una orden sin tasa (o con algún
    // renglón que no la tenía) deja `null` en el ítem. `Number(null)` da `0`,
    // así que sumar sin más produciría un total "verdadero" de `Bs. 0,00` en
    // vez de ausente: exactamente lo que `money.util.ts` dice que hay que
    // evitar. Si falta la tasa en CUALQUIER renglón, el total en bolívares no
    // se puede afirmar -- no es cero, es desconocido -- así que el resultado
    // es `null` y `formatVes` deja que la plantilla oculte el bloque.
    const itemsGrossTotalVes = order.items.some(
      (item) => item.priceVes === null,
    )
      ? null
      : round2(
          order.items.reduce(
            (sum, item) => sum + item.quantity * Number(item.priceVes),
            0,
          ),
        );

    const subject = `Recibimos tu pedido ${order.orderNumber}`;

    const html = await this.render('order-confirmation', {
      ...this.payloads.buildCommon(),
      subject,
      // Igual que en la plantilla: si no hay tasa, `formatVes` devuelve
      // `null` y el preheader cae al dólar en vez de dejar un "Bs. " suelto
      // (`{{preheader}}` va sin condicional en el `<div>` oculto de arriba).
      preheader: `Estamos verificando tu pago · ${
        formatVes(order.totalVes) !== null
          ? `Bs. ${formatVes(order.totalVes)}`
          : `$${Number(order.total).toFixed(2)}`
      }`,
      trackingUrl: this.payloads.trackingUrl(order.orderNumber),
      customerName: this.customerName(order),
      orderNumber: order.orderNumber,
      items: order.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: Number(item.price).toFixed(2),
        priceVes: formatVes(item.priceVes),
        // Monto BRUTO del renglón (cantidad × precio unitario), no
        // `item.subtotal`: desde que el checkout desglosa el descuento por
        // línea, `item.subtotal` viene NETO de la porción de descuento que
        // le tocó a esa línea, así que `quantity × price` ya no es igual a
        // `subtotal` (con cupón, el correo mostraba "3 × $3.00" al lado de
        // "$8.37", una aritmética que no cierra a la vista). Mostrando el
        // bruto acá, y el descuento una sola vez en el bloque de totales, el
        // renglón vuelve a sumar a mano: "3 × $3.00 = $9.00", con los $4.27
        // en su propia fila.
        lineAmount: round2(item.quantity * Number(item.price)).toFixed(2),
        lineAmountVes: formatVes(item.subtotalVes),
      })),
      // "Subtotal (con IVA)" sólo tiene sentido cuando hay descuento: es el
      // punto de partida desde el que se resta el cupón. Sin descuento sería
      // un segundo subtotal idéntico al de siempre, así que el template lo
      // omite (ver condicional `discountAmount` más abajo).
      itemsGrossTotalVes: formatVes(itemsGrossTotalVes),
      // `order.subtotal` es la BASE imponible, ya neta del descuento (nunca
      // el "subtotal bruto" que sugiere el nombre del campo). Se relabelea acá
      // como "Base imponible" en el template para que no compita con
      // "Subtotal (con IVA)".
      subtotalVes: formatVes(order.subtotalVes),
      tax: order.tax > 0 ? Number(order.tax).toFixed(2) : null,
      taxVes: formatVes(order.taxVes),
      // El rótulo del IVA sólo lleva porcentaje cuando se puede afirmar una
      // única alícuota para todo el pedido: si algún ítem tiene alícuotas
      // mezcladas (o su producto fue borrado y no se puede consultar), un
      // único "16%" sería falso para las líneas que tributan distinto. "IVA"
      // a secas es siempre correcto; el detalle por línea ya lo tiene el
      // panel admin.
      ivaLabel: this.ivaLabel(order),
      // El descuento no aparecía en ningún lado del comprobante: el cliente
      // no tenía forma de reconciliar el total con lo que veía por renglón.
      discountAmount:
        Number(order.discountAmount) > 0
          ? Number(order.discountAmount).toFixed(2)
          : null,
      discountAmountVes: formatVes(order.discountAmountVes),
      discountCode: order.discountCode || null,
      total: Number(order.total).toFixed(2),
      totalVes: formatVes(order.totalVes),
      exchangeRate: order.exchangeRate ? formatVes(order.exchangeRate) : null,
      exchangeRateDate: order.exchangeRateDate,
      isPickup,
      shippingAddress: isPickup ? null : order.shippingAddress,
      paymentMethod: this.translatePaymentMethod(order.paymentInfo.method),
      paymentReference: order.paymentInfo?.referenceCode ?? null,
      verificationSla: '24 horas hábiles',
      isZelle: order.paymentInfo.method === PaymentMethod.ZELLE,
      // `order.notes` no se pasa a propósito: la plantilla rediseñada no
      // muestra la nota del cliente (el admin la sigue viendo en el panel).
    });
    if (!html) return;

    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) {
      console.error('No recipient email found for order:', order.orderNumber);
      return;
    }

    await this.sendEmail(recipientEmail, subject, html);
  }

  async sendPaymentConfirmed(order: Order): Promise<void> {
    const subject = `Confirmamos tu pago del pedido ${order.orderNumber}`;

    const html = await this.render('payment-confirmed', {
      ...this.payloads.buildCommon(),
      subject,
      preheader: 'Tu pedido pasa a preparación',
      trackingUrl: this.payloads.trackingUrl(order.orderNumber),
      customerName: this.customerName(order),
      orderNumber: order.orderNumber,
      orderStatus: this.translateStatus(order.status),
      isPickup: order.deliveryMethod === DeliveryMethod.PICKUP,
      total: Number(order.total).toFixed(2),
      totalVes: formatVes(order.totalVes),
      exchangeRate: formatVes(order.exchangeRate),
      paymentMethod: this.translatePaymentMethod(order.paymentInfo?.method),
      paymentReference: order.paymentInfo?.referenceCode ?? null,
      // No existe un campo `verifiedAt` dedicado, y `paymentInfo.updatedAt`
      // no sirve de sustituto: este correo se dispara desde dos sitios
      // (`updateOrderStatus`, cuando el admin verifica el pago a mano, y
      // `completeOrder`, cuando el ERP factura) y sólo en el primero
      // `updatedAt` coincide con la verificación. En `completeOrder` no se
      // toca `paymentInfo` — `updatedAt` quedaría en la fecha del último
      // cambio del pago (p.ej. cuando se subió el comprobante), y el correo
      // le mostraría al cliente una verificación que no ocurrió ese día.
      // Va en `null` a propósito: la plantilla oculta el bloque, que es
      // preferible a una fecha inventada. Para llenarlo de verdad hace falta
      // una columna `verified_at` en `payment_info`, escrita en el momento
      // en que el pago pasa a VERIFIED.
      verifiedAt: null,
      // No se calcula ninguna fecha estimada de entrega en el sistema; la
      // plantilla oculta el bloque cuando llega null.
      estimatedDelivery: null,
    });
    if (!html) return;

    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) {
      console.error('No recipient email found for order:', order.orderNumber);
      return;
    }

    await this.sendEmail(recipientEmail, subject, html);
  }

  async sendOrderShipped(order: Order): Promise<void> {
    const subject = `Tu pedido ${order.orderNumber} va en camino`;

    const html = await this.render('order-shipped', {
      ...this.payloads.buildCommon(),
      subject,
      preheader: 'Coordinamos la entrega contigo por WhatsApp',
      trackingUrl: this.payloads.trackingUrl(order.orderNumber),
      customerName: this.customerName(order),
      orderNumber: order.orderNumber,
      shippingAddress: order.shippingAddress,
    });
    if (!html) return;

    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) {
      console.error('No recipient email found for order:', order.orderNumber);
      return;
    }

    await this.sendEmail(recipientEmail, subject, html);
  }

  async sendAdminNewOrder(order: Order): Promise<void> {
    const adminEmail = this.resolveAdminEmail('pedido nuevo');
    if (!adminEmail) return;

    const frontendUrl =
      this.configService.get('app.frontendUrl') || 'http://localhost:3001';
    const customerName = order.shippingAddress
      ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`
      : order.user?.email || order.guestEmail || 'Cliente invitado';
    const itemCount = order.items?.length || 0;

    const html = await this.render('admin-new-order', {
      ...this.payloads.buildCommon(),
      subject: `Pedido nuevo ${order.orderNumber}`,
      // Mismo motivo que en `sendOrderConfirmation`: sin tasa, cae al dólar
      // en vez de dejar un "Bs. " suelto en el preheader.
      preheader: `${itemCount} artículos · ${
        formatVes(order.totalVes) !== null
          ? `Bs. ${formatVes(order.totalVes)}`
          : `$${Number(order.total).toFixed(2)}`
      }`,
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      customerName,
      customerEmail: order.user?.email || order.guestEmail || '—',
      total: Number(order.total).toFixed(2),
      totalVes: formatVes(order.totalVes),
      exchangeRate: formatVes(order.exchangeRate),
      paymentMethod: this.translatePaymentMethod(order.paymentInfo?.method),
      isZelle: order.paymentInfo?.method === PaymentMethod.ZELLE,
      deliveryMethod:
        order.deliveryMethod === 'pickup' ? 'Retiro en tienda' : 'Delivery',
      itemCount,
      adminUrl: `${frontendUrl}/admin/dashboard/ordenes/${order.uuid}`,
    });
    if (!html) return;

    await this.sendEmail(adminEmail, `Pedido nuevo ${order.orderNumber}`, html);
  }

  async sendEmailVerification(params: {
    to: string;
    firstName?: string;
    verificationUrl: string;
    storeName: string;
  }): Promise<void> {
    const subject = `Confirma tu correo electrónico - ${params.storeName}`;

    const html = await this.render('email-verification', {
      ...this.payloads.buildCommon(),
      subject,
      preheader: 'Confírmalo para activar tu cuenta',
      firstName: params.firstName,
      verificationUrl: params.verificationUrl,
      storeName: params.storeName,
    });
    if (!html) return;

    await this.sendEmail(params.to, subject, html);
  }

  async sendPasswordReset(params: {
    to: string;
    firstName?: string;
    resetUrl: string;
    storeName: string;
  }): Promise<void> {
    const subject = `Restablece tu contraseña - ${params.storeName}`;

    const html = await this.render('password-reset', {
      ...this.payloads.buildCommon(),
      subject,
      preheader: 'El enlace vence en 1 hora',
      // La plantilla lo muestra para que el cliente sepa a qué cuenta
      // corresponde el enlace, sin depender de `firstName` (opcional).
      email: params.to,
      firstName: params.firstName,
      resetUrl: params.resetUrl,
      storeName: params.storeName,
    });
    if (!html) return;

    await this.sendEmail(params.to, subject, html);
  }

  async sendInvitationEmail(params: {
    to: string;
    inviteUrl: string;
    firstName?: string;
    role: string;
    expiresAt: Date | string;
    invitedByName?: string;
    storeName: string;
  }): Promise<void> {
    const subject = `Invitación para unirte a ${params.storeName}`;

    const html = await this.render('invitation', {
      ...this.payloads.buildCommon(),
      subject,
      preheader: 'Crea tu contraseña para entrar al panel',
      firstName: params.firstName,
      inviteUrl: params.inviteUrl,
      invitedByName: params.invitedByName ?? null,
      roleLabel: this.roleLabel(params.role),
      permissions: this.permissionsFor(params.role),
      expiresAtFormatted: new Date(params.expiresAt).toLocaleDateString(
        'es-VE',
        { day: 'numeric', month: 'long', year: 'numeric' },
      ),
      storeName: params.storeName,
    });
    if (!html) return;

    await this.sendEmail(params.to, subject, html);
  }

  /**
   * Aviso de que el pago no se pudo verificar.
   *
   * `reportedAmountVes` -- lo que el cliente dijo haber pagado -- no se
   * recoge en ninguna parte: al rechazar, el admin sólo puede dejar
   * `adminNotes`. Va en `null`, igual que `differenceVes` y `reservedUntil`
   * (tampoco existen en el sistema), y la plantilla omite esos renglones.
   */
  async sendPaymentRejected(order: Order): Promise<void> {
    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) return;

    const subject = `No pudimos verificar tu pago del pedido ${order.orderNumber}`;

    const html = await this.render('payment-rejected', {
      ...this.payloads.buildCommon(),
      subject,
      preheader: 'Escríbenos y lo revisamos contigo',
      orderNumber: order.orderNumber,
      customerName: this.customerName(order),
      paymentReference: order.paymentInfo?.referenceCode ?? null,
      totalVes: formatVes(order.totalVes),
      reportedAmountVes: null,
      differenceVes: null,
      reservedUntil: null,
    });
    if (!html) return;

    await this.sendEmail(recipientEmail, subject, html);
  }

  /** Se envía cuando la cuenta queda utilizable, es decir tras verificar el correo. */
  async sendWelcome(params: { to: string; firstName: string }): Promise<void> {
    const comun = this.payloads.buildCommon();
    const subject = `Tu cuenta en ${comun.store.name} ya está lista`;

    const html = await this.render('welcome', {
      ...comun,
      subject,
      preheader: 'Ya puedes seguir tus pedidos desde tu cuenta',
      firstName: params.firstName,
      catalogUrl: `${this.configService.get('app.frontendUrl')}/productos`,
    });
    if (!html) return;

    await this.sendEmail(params.to, subject, html);
  }

  /**
   * Rótulo del renglón de IVA del comprobante.
   *
   * Sólo agrega el porcentaje cuando TODOS los ítems comparten la misma
   * alícuota y ninguno tiene el producto borrado (soft-delete deja
   * `item.product` en `null`, y sin el producto no hay forma de conocer su
   * `ivaType`). Mezclar alícuotas y mostrar un solo porcentaje le mentiría al
   * cliente sobre cómo se calculó el impuesto de alguna línea.
   */
  private ivaLabel(order: Order): string {
    const ivaTypes = new Set(order.items.map((item) => item.product?.ivaType));
    if (ivaTypes.size !== 1) {
      return 'IVA';
    }

    const [ivaType] = ivaTypes;
    if (ivaType === undefined || ivaType === null) {
      return 'IVA';
    }

    const rate = IVA_RATES[ivaType];
    return `IVA (${Math.round(rate * 100)}%)`;
  }

  private translateStatus(status: string): string {
    const statusMap = {
      'on-hold': 'Pendiente',
      pending: 'En proceso',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return statusMap[status] || status;
  }

  private translatePaymentMethod(method: string): string {
    const methodMap = {
      zelle: 'Zelle',
      pagomovil: 'Pago Móvil',
      transferencia: 'Transferencia Bancaria',
    };
    return methodMap[method] || method;
  }

  /** Rol en español para el correo de invitación. */
  private roleLabel(role: string): string {
    const etiquetas: Record<string, string> = {
      admin: 'Administrador',
      order_admin: 'Gestor de pedidos',
      customer: 'Cliente',
      user: 'Cliente',
    };
    return etiquetas[role] ?? role;
  }

  /**
   * Qué puede y qué no puede hacer el rol invitado, para que quien acepta la
   * invitación sepa antes de entrar. Sólo hay dos niveles reales en el panel
   * (admin y todo lo demás), así que cualquier rol que no sea `admin` recibe
   * el set de permisos de gestor de pedidos.
   */
  private permissionsFor(role: string): { text: string; denied?: boolean }[] {
    if (role === 'admin') {
      return [
        { text: 'Gestionar productos y categorías' },
        { text: 'Gestionar pedidos y verificar pagos' },
        { text: 'Invitar y administrar usuarios' },
      ];
    }

    return [
      { text: 'Ver y gestionar pedidos' },
      { text: 'Verificar pagos' },
      { text: 'Gestionar productos', denied: true },
      { text: 'Administrar usuarios', denied: true },
    ];
  }
}

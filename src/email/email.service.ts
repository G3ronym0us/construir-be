import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Order } from '../orders/order.entity';
import { PaymentMethod } from '../orders/payment-info.entity';
import { round2 } from '../products/iva.util';
import { IVA_RATES } from '../products/enums/iva-type.enum';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
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
  }

  private async loadTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(
      __dirname,
      'templates',
      `${templateName}.hbs`,
    );
    return fs.readFileSync(templatePath, 'utf-8');
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

  private getLogoUrl(): string {
    const frontendUrl =
      this.configService.get('app.frontendUrl') || 'http://localhost:4000';
    return `${frontendUrl}/construir-logo.png`;
  }

  async sendOrderConfirmation(order: Order): Promise<void> {
    const templateSource = await this.loadTemplate('order-confirmation');
    const template = handlebars.compile(templateSource);

    const appUrl = this.configService.get('app.url') || 'http://localhost:3000';

    const isPickup = order.deliveryMethod === 'pickup';

    // Monto bruto (con IVA) de todos los renglones, sumando cantidad ×
    // precio unitario. No existe persistido en la orden -- `order.subtotal`
    // es la BASE ya neta del descuento (ver docs/pricing-iva.md) -- así que
    // se recalcula acá con los mismos ítems que arma el correo, para que
    // "Subtotal (con IVA)" coincida exactamente con la suma de los renglones
    // que el cliente ve arriba.
    const itemsGrossTotal = round2(
      order.items.reduce(
        (sum, item) => sum + item.quantity * Number(item.price),
        0,
      ),
    );

    const html = template({
      logoUrl: this.getLogoUrl(),
      customerName:
        order.shippingAddress?.firstName || order.user?.firstName || 'Cliente',
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      orderStatus: this.translateStatus(order.status),
      items: order.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        price: Number(item.price).toFixed(2),
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
      })),
      // "Subtotal (con IVA)" sólo tiene sentido cuando hay descuento: es el
      // punto de partida desde el que se resta el cupón. Sin descuento sería
      // un segundo subtotal idéntico al de siempre, así que el template lo
      // omite (ver condicional `discountAmount` más abajo).
      itemsGrossTotal: itemsGrossTotal.toFixed(2),
      // `order.subtotal` es la BASE imponible, ya neta del descuento (nunca
      // el "subtotal bruto" que sugiere el nombre del campo). Se relabelea acá
      // como "Base imponible" en el template para que no compita con
      // "Subtotal (con IVA)".
      subtotal: Number(order.subtotal).toFixed(2),
      tax: order.tax > 0 ? Number(order.tax).toFixed(2) : null,
      // El rótulo del IVA sólo lleva porcentaje cuando se puede afirmar una
      // única alícuota para todo el pedido: si algún ítem tiene alícuotas
      // mezcladas (o su producto fue borrado y no se puede consultar), un
      // único "16%" sería falso para las líneas que tributan distinto. "IVA"
      // a secas es siempre correcto; el detalle por línea ya lo tiene el
      // panel admin.
      ivaLabel: this.ivaLabel(order),
      shipping: order.shipping > 0 ? Number(order.shipping).toFixed(2) : null,
      // El descuento no aparecía en ningún lado del comprobante: el cliente
      // no tenía forma de reconciliar el total con lo que veía por renglón.
      discountAmount:
        Number(order.discountAmount) > 0
          ? Number(order.discountAmount).toFixed(2)
          : null,
      discountCode: order.discountCode || null,
      total: Number(order.total).toFixed(2),
      isPickup,
      shippingAddress: isPickup ? null : order.shippingAddress,
      store: isPickup
        ? {
            name: this.configService.get('app.storeName'),
            address: this.configService.get('app.storeAddress'),
            city: this.configService.get('app.storeCity'),
            phone: this.configService.get('app.storePhone'),
            hours: this.configService.get('app.storeHours'),
            mapUrl: this.configService.get('app.storeMapUrl'),
          }
        : null,
      paymentMethod: this.translatePaymentMethod(order.paymentInfo.method),
      isZelle: order.paymentInfo.method === PaymentMethod.ZELLE,
      notes: order.notes,
      trackingUrl: `${appUrl}/orders/track/${order.orderNumber}`,
    });

    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) {
      console.error('No recipient email found for order:', order.orderNumber);
      return;
    }

    await this.sendEmail(
      recipientEmail,
      `Confirmación de Orden #${order.orderNumber}`,
      html,
    );
  }

  async sendPaymentConfirmed(order: Order): Promise<void> {
    const templateSource = await this.loadTemplate('payment-confirmed');
    const template = handlebars.compile(templateSource);

    const appUrl = this.configService.get('app.url') || 'http://localhost:3000';

    const html = template({
      logoUrl: this.getLogoUrl(),
      customerName:
        order.shippingAddress?.firstName || order.user?.firstName || 'Cliente',
      orderNumber: order.orderNumber,
      orderStatus: this.translateStatus(order.status),
      total: Number(order.total).toFixed(2),
      trackingUrl: `${appUrl}/orders/track/${order.orderNumber}`,
    });

    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) {
      console.error('No recipient email found for order:', order.orderNumber);
      return;
    }

    await this.sendEmail(
      recipientEmail,
      `Pago Confirmado - Orden #${order.orderNumber}`,
      html,
    );
  }

  async sendOrderShipped(order: Order, trackingNumber?: string): Promise<void> {
    const templateSource = await this.loadTemplate('order-shipped');
    const template = handlebars.compile(templateSource);

    const appUrl = this.configService.get('app.url') || 'http://localhost:3000';

    const html = template({
      logoUrl: this.getLogoUrl(),
      customerName:
        order.shippingAddress?.firstName || order.user?.firstName || 'Cliente',
      orderNumber: order.orderNumber,
      trackingNumber,
      shippingAddress: order.shippingAddress,
      trackingUrl: `${appUrl}/orders/track/${order.orderNumber}`,
    });

    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) {
      console.error('No recipient email found for order:', order.orderNumber);
      return;
    }

    await this.sendEmail(
      recipientEmail,
      `Tu Orden ha Sido Enviada - #${order.orderNumber}`,
      html,
    );
  }

  async sendOrderDelivered(order: Order): Promise<void> {
    const templateSource = await this.loadTemplate('order-delivered');
    const template = handlebars.compile(templateSource);

    const html = template({
      logoUrl: this.getLogoUrl(),
      customerName:
        order.shippingAddress?.firstName || order.user?.firstName || 'Cliente',
      orderNumber: order.orderNumber,
      deliveryDate: new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });

    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) {
      console.error('No recipient email found for order:', order.orderNumber);
      return;
    }

    await this.sendEmail(
      recipientEmail,
      `Orden Entregada - #${order.orderNumber}`,
      html,
    );
  }

  async sendOrderCanceled(order: Order): Promise<void> {
    const templateSource = await this.loadTemplate('order-canceled');
    const template = handlebars.compile(templateSource);

    const html = template({
      logoUrl: this.getLogoUrl(),
      customerName:
        order.shippingAddress?.firstName || order.user?.firstName || 'Cliente',
      orderNumber: order.orderNumber,
    });

    const recipientEmail = order.user?.email || order.guestEmail;
    if (!recipientEmail) {
      console.error('No recipient email found for order:', order.orderNumber);
      return;
    }

    await this.sendEmail(
      recipientEmail,
      `Orden Cancelada #${order.orderNumber}`,
      html,
    );
  }

  async sendAdminNewOrder(order: Order): Promise<void> {
    const adminEmail = this.configService.get<string>(
      'email.adminNotificationEmail',
    );
    if (!adminEmail) return;

    const templateSource = await this.loadTemplate('admin-new-order');
    const template = handlebars.compile(templateSource);

    const frontendUrl =
      this.configService.get('app.frontendUrl') || 'http://localhost:3001';
    const customerName = order.shippingAddress
      ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`
      : order.user?.email || order.guestEmail || 'Cliente invitado';

    const html = template({
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
      paymentMethod: this.translatePaymentMethod(order.paymentInfo?.method),
      isZelle: order.paymentInfo?.method === PaymentMethod.ZELLE,
      deliveryMethod:
        order.deliveryMethod === 'pickup' ? 'Retiro en tienda' : 'Delivery',
      itemCount: order.items?.length || 0,
      adminUrl: `${frontendUrl}/admin/dashboard/ordenes/${order.uuid}`,
    });

    await this.sendEmail(
      adminEmail,
      `🛒 Nueva orden #${order.orderNumber}`,
      html,
    );
  }

  async sendAdminOrderCancelled(order: Order): Promise<void> {
    const adminEmail = this.configService.get<string>(
      'email.adminNotificationEmail',
    );
    if (!adminEmail) return;

    const templateSource = await this.loadTemplate('admin-order-cancelled');
    const template = handlebars.compile(templateSource);

    const frontendUrl =
      this.configService.get('app.frontendUrl') || 'http://localhost:3001';
    const customerName = order.shippingAddress
      ? `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`
      : order.user?.email || order.guestEmail || 'Cliente invitado';

    const html = template({
      orderNumber: order.orderNumber,
      customerName,
      customerEmail: order.user?.email || order.guestEmail || '—',
      total: Number(order.total).toFixed(2),
      adminUrl: `${frontendUrl}/admin/dashboard/ordenes/${order.uuid}`,
    });

    await this.sendEmail(
      adminEmail,
      `❌ Orden cancelada #${order.orderNumber}`,
      html,
    );
  }

  async sendEmailVerification(params: {
    to: string;
    firstName?: string;
    verificationUrl: string;
    storeName: string;
  }): Promise<void> {
    const templateSource = await this.loadTemplate('email-verification');
    const template = handlebars.compile(templateSource);

    const html = template({
      logoUrl: this.getLogoUrl(),
      firstName: params.firstName,
      verificationUrl: params.verificationUrl,
      storeName: params.storeName,
    });

    await this.sendEmail(
      params.to,
      `Confirma tu correo electrónico - ${params.storeName}`,
      html,
    );
  }

  async sendPasswordReset(params: {
    to: string;
    firstName?: string;
    resetUrl: string;
    storeName: string;
  }): Promise<void> {
    const templateSource = await this.loadTemplate('password-reset');
    const template = handlebars.compile(templateSource);

    const html = template({
      logoUrl: this.getLogoUrl(),
      firstName: params.firstName,
      resetUrl: params.resetUrl,
      storeName: params.storeName,
    });

    await this.sendEmail(
      params.to,
      `Restablece tu contraseña - ${params.storeName}`,
      html,
    );
  }

  async sendInvitationEmail(params: {
    to: string;
    inviteUrl: string;
    firstName?: string;
    role: string;
    expiresAtFormatted: string;
    storeName: string;
  }): Promise<void> {
    const templateSource = await this.loadTemplate('invitation');
    const template = handlebars.compile(templateSource);

    const html = template({
      logoUrl: this.getLogoUrl(),
      firstName: params.firstName,
      inviteUrl: params.inviteUrl,
      role: params.role,
      expiresAtFormatted: params.expiresAtFormatted,
      storeName: params.storeName,
    });

    await this.sendEmail(
      params.to,
      `Invitación para unirte a ${params.storeName}`,
      html,
    );
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
}

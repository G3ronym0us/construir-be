import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Order } from '../orders/order.entity';

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
        from: this.configService.get('email.from') || '"Construir" <noreply@construir.com>',
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

  async sendOrderConfirmation(order: Order): Promise<void> {
    const templateSource = await this.loadTemplate('order-confirmation');
    const template = handlebars.compile(templateSource);

    const appUrl = this.configService.get('app.url') || 'http://localhost:3000';

    const html = template({
      customerName: order.shippingAddress?.firstName || order.user?.firstName || 'Cliente',
      orderNumber: order.orderNumber,
      orderDate: new Date(order.createdAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      orderStatus: this.translateStatus(order.status),
      items: order.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        price: Number(item.price).toFixed(2),
        subtotal: Number(item.subtotal).toFixed(2),
      })),
      subtotal: Number(order.subtotal).toFixed(2),
      tax: order.tax > 0 ? Number(order.tax).toFixed(2) : null,
      shipping: order.shipping > 0 ? Number(order.shipping).toFixed(2) : null,
      total: Number(order.total).toFixed(2),
      shippingAddress: order.shippingAddress,
      paymentMethod: this.translatePaymentMethod(order.paymentInfo.method),
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
      customerName: order.shippingAddress?.firstName || order.user?.firstName || 'Cliente',
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
      customerName: order.shippingAddress?.firstName || order.user?.firstName || 'Cliente',
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
      customerName: order.shippingAddress?.firstName || order.user?.firstName || 'Cliente',
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

  private translateStatus(status: string): string {
    const statusMap = {
      pending: 'Pendiente',
      payment_review: 'Pago en Revisión',
      confirmed: 'Confirmada',
      processing: 'Procesando',
      shipped: 'Enviada',
      delivered: 'Entregada',
      cancelled: 'Cancelada',
      refunded: 'Reembolsada',
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

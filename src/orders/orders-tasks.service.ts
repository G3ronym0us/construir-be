import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';
import { parseHorarioComercial } from './horario-habil';

/**
 * Liberación programada del inventario que apartan los pedidos sin pagar.
 *
 * Crear un pedido descuenta stock en el acto y lo deja `on-hold` esperando el
 * pago. Sin nadie que lo suelte, un pedido que nunca se paga aparta esas
 * unidades para siempre — y como `POST /orders` es público y sin sesión, agotar
 * el catálogo entero salía gratis. El límite de tasa acota el ritmo por
 * visitante, pero no devuelve nada de lo ya apartado.
 *
 * Corre cada quince minutos porque el plazo se mide en horas: con una pasada
 * diaria, un pedido de la mañana soltaría el stock al día siguiente. En hora de
 * Caracas, igual que el resto de las tareas.
 *
 * **El plazo se cuenta en horas HÁBILES**: el reloj sólo avanza dentro del
 * horario de atención y se detiene con la tienda cerrada. Un pedido del viernes
 * a las 16:00 tiene una hora hábil ese día y se le acaba el plazo el sábado
 * sobre las 10:00; uno del domingo no empieza a contar hasta el lunes a las
 * ocho. La razón está medida: sobre los doce pedidos reales de la base, a cinco
 * de ellos (42 %) la ventana de tres horas corridas se les agotaba entera con
 * la tienda cerrada, y la promesa al cliente es verificar el pago en menos de
 * dos horas hábiles.
 *
 * **Dos plazos, según el método de pago.** Un pedido Zelle llega con
 * `payment_info` completamente vacío porque la tienda no publica esos datos: un
 * operador se los manda al cliente por WhatsApp y el cliente paga después. Ese
 * cliente está esperando A LA TIENDA, igual que uno con el comprobante sin
 * revisar, así que no se le puede aplicar el plazo de «no mandaste el
 * comprobante»: se le aplica `ORDERS_UNPAID_RELEASE_HOURS_AWAITING_DETAILS`,
 * que es más largo porque incluye lo que tarde la tienda en escribirle.
 *
 * No se les exime del todo a propósito: mandar `paymentMethod: "zelle"` es
 * gratis y es exactamente lo que manda la tienda de verdad, sin ningún dato, de
 * modo que un Zelle que no caducara nunca sería una palabra clave para apartar
 * inventario para siempre.
 *
 * **Los festivos venezolanos no se tienen en cuenta**, porque no existen en
 * ninguna parte de este proyecto y no se van a inventar acá. La consecuencia
 * concreta: un 24 de junio el reloj corre como si la tienda estuviera abierta,
 * y un pedido de la víspera puede vencer sin que nadie haya podido mirarlo. Si
 * eso importa, la solución es una lista de días no laborables en el entorno, y
 * es una decisión del dueño, no del código.
 */
@Injectable()
export class OrdersTasksService {
  private readonly logger = new Logger(OrdersTasksService.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('*/15 * * * *', {
    name: 'liberar-stock-sin-pagar',
    timeZone: 'America/Caracas',
  })
  async handleUnpaidOrderRelease(): Promise<void> {
    const horas = this.configService.get<number | null>(
      'orders.unpaidReleaseHours',
    );

    // La configuración ya rechaza lo que no sea un entero positivo y entrega
    // `null` en ese caso. Acá sólo queda decidir qué hacer con esa ausencia, y
    // la respuesta es no cancelar: un plazo que no se entiende no puede
    // convertirse en pedidos anulados de clientes reales. Un `ORDERS_UNPAID_
    // RELEASE_HOURS=3e2` que `parseInt` leyera como 3 y este método aceptara
    // sería una anulación masiva informando de éxito.
    if (horas === null || horas === undefined) {
      this.logger.warn(
        'ORDERS_UNPAID_RELEASE_HOURS no es un entero positivo de horas; ' +
          'no se libera ningún pedido. Revísalo: el stock de los pedidos sin ' +
          'pagar seguirá apartado.',
      );
      return;
    }

    // El plazo largo, para los métodos en los que el cliente no puede pagar
    // hasta que la tienda le escriba (hoy sólo Zelle). Se valida igual, y un
    // valor ilegible **detiene la pasada entera**, no sólo los Zelle: si no se
    // entiende una de las dos cuentas atrás, no se cancela nada. Es la
    // dirección segura y evita que una pasada se aplique a medias.
    const horasEsperandoDatos = this.configService.get<number | null>(
      'orders.unpaidReleaseHoursAwaitingDetails',
    );

    if (horasEsperandoDatos === null || horasEsperandoDatos === undefined) {
      this.logger.warn(
        'ORDERS_UNPAID_RELEASE_HOURS_AWAITING_DETAILS no es un entero ' +
          'positivo de horas; no se libera ningún pedido. Es el plazo de los ' +
          'pedidos Zelle, que esperan a que la tienda les mande los datos.',
      );
      return;
    }

    // Y lo mismo con el horario, por el mismo motivo y con más filo: un horario
    // a medias no deja el reloj parado, lo deja corriendo cuando no debe. Si no
    // se entiende entero, no se cancela nada.
    const horario = parseHorarioComercial(
      this.configService.get<string>('orders.businessHours'),
    );

    if (horario === null) {
      this.logger.warn(
        'ORDERS_BUSINESS_HOURS no se entiende (formato: ' +
          '"1-5:08:00-17:00;6:08:00-12:00"); no se libera ningún pedido. ' +
          'Sin horario válido no hay forma de contar horas hábiles, y contar ' +
          'mal significa anular pedidos de clientes que sí pagaron.',
      );
      return;
    }

    // La zona del reloj es la de la tienda, no la del servidor: un servidor en
    // UTC contaría las franjas cuatro horas corridas.
    const zona =
      this.configService.get<string>('app.storeTimezone') || 'America/Caracas';

    try {
      const { liberados, omitidos, fallidos } =
        await this.ordersService.liberarPedidosSinPagar(
          horas,
          horasEsperandoDatos,
          horario,
          zona,
        );

      if (liberados === 0 && omitidos === 0 && fallidos === 0) {
        this.logger.debug(
          `Sin pedidos que liberar (${horas} h hábiles sin datos de pago, ` +
            `${horasEsperandoDatos} h para los que esperan datos de la tienda)`,
        );
        return;
      }

      this.logger.log(
        `Liberación de pedidos sin pagar (${horas} h hábiles, ` +
          `${horasEsperandoDatos} h los que esperan datos): ${liberados} ` +
          `anulados con su inventario devuelto, ${omitidos} respetados por ` +
          'haber aportado datos de pago, no tener el plazo agotado o haber ' +
          `cambiado de estado, ${fallidos} con error.`,
      );
    } catch (error) {
      this.logger.error('Error al liberar pedidos sin pagar:', error);
    }
  }
}

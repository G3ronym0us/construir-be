import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';
import { DeliveryMethod } from './order.entity';
import { CustomerInfoDto, ShippingAddressDto } from './dto/create-order.dto';
import { normalizarTelefonoParaComparar } from '../common/validation/venezuela';
import {
  GuestCustomerAutocomplete,
  aAutocompletado,
} from './guest-customer-autocomplete';

/**
 * Resume un teléfono ya normalizado en 32 bytes, siempre los mismos 32.
 *
 * Se compara el resumen y no la cadena para que el cotejo cueste lo mismo
 * pase lo que pase: dos teléfonos de largo distinto o que difieren en el
 * primer dígito tardarían tiempos distintos en compararse tal cual, y ese
 * tiempo es información.
 *
 * Un teléfono ausente o inservible se sustituye por bytes al azar, distintos
 * en cada llamada. Así el trabajo es idéntico al del caso con registro y,
 * sobre todo, dos ausencias nunca pueden empatar entre sí: sin esto, consultar
 * una cédula inexistente con un teléfono basura daría "coincide".
 */
function huellaTelefono(valor: unknown): Buffer {
  const normalizado = normalizarTelefonoParaComparar(valor);
  return createHash('sha256')
    .update(normalizado ?? randomBytes(32))
    .digest();
}

/**
 * ¿Son el mismo teléfono, aunque estén escritos distinto?
 *
 * Quien una vez escribió "0414-1234567" y otra "04141234567" tiene que
 * reconocerse a sí mismo: se compara la forma normalizada, nunca la cruda.
 */
function mismoTelefono(guardado: unknown, recibido: unknown): boolean {
  return timingSafeEqual(huellaTelefono(guardado), huellaTelefono(recibido));
}

/**
 * Lo que hay que asignarle a una columna para vaciarla de verdad.
 *
 * Para TypeORM `undefined` significa "no toques esta columna" y `null`
 * significa "ponla a NULL". Poniendo `undefined` el borrado no llegaba a la
 * base —el UPDATE ni mencionaba esas columnas— y la dirección de la víctima
 * sobrevivía al rodeo pese a que el código parecía estar borrándola. Las
 * pruebas con el repositorio simulado no lo veían, porque un doble de prueba
 * no reproduce esa semántica: se descubrió mandando el ataque contra la base
 * de verdad.
 *
 * La entidad declara estos campos opcionales y no nulables, de ahí el cast.
 */
const BORRA_LA_COLUMNA = null as unknown as undefined;

/** Los campos del domicilio guardado en la ficha, en un solo sitio. */
const CAMPOS_DEL_DOMICILIO = [
  'address',
  'city',
  'state',
  'zipCode',
  'country',
  'additionalInfo',
  'latitude',
  'longitude',
] as const;

/**
 * Vacía el domicilio guardado, de verdad y hasta el último campo.
 *
 * Se recorre la lista en vez de escribir ocho asignaciones porque así añadir
 * una columna de domicilio a la entidad no puede olvidarse de borrarla: es
 * justo el olvido que dejó vivo el ataque por `delivery`.
 */
function borraElDomicilio(cliente: GuestCustomer): void {
  for (const campo of CAMPOS_DEL_DOMICILIO) {
    (cliente as unknown as Record<string, unknown>)[campo] = BORRA_LA_COLUMNA;
  }
  cliente.country = 'Venezuela';
}

/**
 * Escribe en la ficha el domicilio que trae el pedido, ENTERO.
 *
 * CUALQUIER campo que el pedido no mande se pone a NULL, no sólo los que el
 * DTO declara opcionales. Ésa es la parte que importa, y la que costó tres
 * intentos: `undefined` significa "no toques esta columna" para TypeORM, así
 * que un campo omitido dejaba vivo el de la ficha anterior. Los "obligatorios"
 * sólo lo son cuando el método es `delivery` —el DTO los valida con un
 * `@ValidateIf`—, de modo que confiar en que siempre llegan era falso.
 *
 * Además de cerrar eso, es lo correcto aunque no hubiera atacante: conservar la
 * referencia y el GPS de la casa anterior colgando de una dirección nueva es
 * dato falso, y manda al repartidor al sitio equivocado.
 */
function escribeElDomicilio(
  cliente: GuestCustomer,
  domicilio: ShippingAddressDto,
): void {
  const origen = domicilio as unknown as Record<string, unknown>;
  const destino = cliente as unknown as Record<string, unknown>;

  // Se recorre la MISMA lista que usa el borrado, en vez de asignar campo a
  // campo: mientras eran dos listas escritas a mano se contradecían, y el
  // campo que una borraba la otra lo dejaba intacto.
  for (const campo of CAMPOS_DEL_DOMICILIO) {
    destino[campo] = origen[campo] ?? BORRA_LA_COLUMNA;
  }
  cliente.country = domicilio.country || 'Venezuela';
}

@Injectable()
export class GuestCustomersService {
  constructor(
    @InjectRepository(GuestCustomer)
    private readonly guestCustomerRepository: Repository<GuestCustomer>,
  ) {}

  /**
   * Busca un cliente guest por su identificación.
   */
  async findByIdentification(
    identificationType: IdentificationType,
    identificationNumber: string,
  ): Promise<GuestCustomer | null> {
    return this.guestCustomerRepository.findOne({
      where: {
        identificationType,
        identificationNumber,
      },
    });
  }

  /**
   * Busca un cliente guest para autocompletar el formulario de checkout.
   *
   * Antes bastaba la identificación, y eso era un agujero: las cédulas
   * venezolanas son secuenciales, así que quien recorriera números en orden
   * iba sacando nombre, correo, teléfono y domicilio de todos los clientes de
   * la tienda. El límite de tasa sólo encarecía el barrido desde una IP; desde
   * muchas no impedía nada.
   *
   * Ahora hace falta un segundo dato que el atacante no puede adivinar: el
   * teléfono. Es lo que un cliente que vuelve sabe de memoria y lo que iba a
   * escribir de todos modos en el paso siguiente, así que a él no le cuesta
   * nada; al que enumera cédulas le cuesta todo.
   *
   * Devuelve `null` en los DOS casos —identificación desconocida y teléfono
   * que no coincide— y a propósito hace el mismo trabajo en ambos: si la
   * respuesta o el tiempo distinguieran "esta cédula no existe" de "existe
   * pero el teléfono está mal", el barrido seguiría siendo posible, sólo que
   * devolviendo un sí/no en vez de la ficha.
   */
  async findForAutocomplete(
    identificationType: IdentificationType,
    identificationNumber: string,
    telefono: unknown,
  ): Promise<GuestCustomerAutocomplete | null> {
    const cliente = await this.findByIdentification(
      identificationType,
      identificationNumber,
    );

    // La comparación se hace SIEMPRE, haya registro o no. Salir antes con un
    // `return null` cuando la cédula no existe es justo lo que le daría al
    // atacante la diferencia de tiempo que necesita para enumerarlas.
    const coincide = mismoTelefono(cliente?.phone, telefono);

    if (!cliente || !coincide) return null;

    return aAutocompletado(cliente);
  }

  /**
   * Crea o actualiza un cliente guest con la información de la orden.
   *
   * La cédula NOMBRA a una persona; el teléfono es lo que prueba que quien
   * pide es esa persona. Cuando el pedido llega con un teléfono que no es el
   * de la ficha, no hay forma de distinguir dos situaciones: el mismo cliente
   * que cambió de número, o alguien distinto que escribió una cédula ajena
   * —que son secuenciales y se adivinan—.
   *
   * Como no se pueden distinguir, la ficha NO PUEDE HEREDAR NADA de su ocupante
   * anterior. Antes sí heredaba, y eso era un rodeo completo del arreglo del
   * buscador: bastaba pedir con la cédula de la víctima, un teléfono propio y
   * `pickup` —sin dirección de envío, para que el `if (shippingAddress)` no
   * corriera— y la ficha quedaba con el teléfono del atacante y la dirección y
   * las coordenadas GPS de la víctima. Después se consultaba el buscador con
   * ese teléfono y salía el domicilio ajeno. Coste para el atacante: un pedido
   * de invitado que se queda esperando un pago que nunca hace, o sea ninguno.
   *
   * Al cliente legítimo que cambió de número esto le cuesta su dirección
   * guardada, que tendrá que reescribir una vez: si pide a domicilio la está
   * escribiendo igual, y si pide para retirar no le hace falta. Desde el
   * pedido siguiente su ficha vuelve a autocompletar con normalidad.
   *
   * `deliveryMethod` es obligatorio a propósito, y no un parámetro más: es lo
   * que decide si la dirección del pedido se mira siquiera. El DTO sólo valida
   * `shippingAddress` cuando el método es `delivery` —lleva un `@ValidateIf`—,
   * así que en un `pickup` ahí puede venir cualquier cosa: un `{}`, o un objeto
   * con la mitad de los campos. Aceptarla igual era la raíz de tres variantes
   * seguidas del mismo ataque. Si el resto del pedido ignora esa dirección
   * —`orders.service` ni siquiera crea el registro de envío cuando es
   * `pickup`—, la ficha tampoco puede hacerle caso.
   */
  async createOrUpdate(
    customerInfo: CustomerInfoDto,
    shippingAddress: ShippingAddressDto | undefined,
    deliveryMethod: DeliveryMethod,
  ): Promise<GuestCustomer> {
    // La dirección de un pedido que no es a domicilio no existe para nadie más
    // en el sistema; aquí tampoco.
    const domicilioDelPedido =
      deliveryMethod === DeliveryMethod.DELIVERY ? shippingAddress : undefined;
    // Buscar si ya existe
    let guestCustomer = await this.findByIdentification(
      customerInfo.identificationType,
      customerInfo.identificationNumber,
    );

    if (guestCustomer) {
      // ¿Quien pide demuestra ser el ocupante actual de la ficha? Se mira
      // ANTES de pisar el teléfono, que si no siempre coincidiría consigo mismo.
      const mismoDueno = mismoTelefono(guestCustomer.phone, customerInfo.phone);

      // Actualizar datos del cliente
      guestCustomer.firstName = customerInfo.firstName;
      guestCustomer.lastName = customerInfo.lastName;
      guestCustomer.email = customerInfo.email;
      guestCustomer.phone = customerInfo.phone;

      // Qué se hereda se decide UNA sola vez y antes de escribir nada: si no
      // probó el teléfono, no se hereda nada del domicilio anterior. Estuvo
      // repartido en dos ramas —la de `pickup` y la de `delivery`— y sólo una
      // de las dos borraba; la otra dejaba pasar los campos opcionales y el
      // ataque seguía funcionando por ahí. Un único sitio, para que no vuelva
      // a divergir.
      if (!mismoDueno) {
        borraElDomicilio(guestCustomer);
      }

      // Y encima se escribe lo que el pedido traiga, si trae algo.
      if (domicilioDelPedido) {
        escribeElDomicilio(guestCustomer, domicilioDelPedido);
      }

      // El historial tampoco se hereda: "3 pedidos anteriores" es de quien los
      // hizo. Quien no prueba el teléfono empieza su cuenta desde cero.
      guestCustomer.ordersCount = mismoDueno ? guestCustomer.ordersCount + 1 : 1;
      guestCustomer.lastOrderDate = new Date();
    } else {
      // Crear nuevo
      guestCustomer = this.guestCustomerRepository.create({
        identificationType: customerInfo.identificationType,
        identificationNumber: customerInfo.identificationNumber,
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: domicilioDelPedido?.address,
        city: domicilioDelPedido?.city,
        state: domicilioDelPedido?.state,
        zipCode: domicilioDelPedido?.zipCode,
        country: domicilioDelPedido?.country || 'Venezuela',
        additionalInfo: domicilioDelPedido?.additionalInfo,
        latitude: domicilioDelPedido?.latitude,
        longitude: domicilioDelPedido?.longitude,
        ordersCount: 1,
        lastOrderDate: new Date(),
      });
    }

    return this.guestCustomerRepository.save(guestCustomer);
  }

  /**
   * Busca un cliente guest por su email
   */
  async findByEmail(email: string): Promise<GuestCustomer | null> {
    return this.guestCustomerRepository.findOne({ where: { email } });
  }

  /**
   * Obtiene todos los clientes guest para campañas de marketing
   */
  async findAll(limit = 100, offset = 0): Promise<GuestCustomer[]> {
    return this.guestCustomerRepository.find({
      take: limit,
      skip: offset,
      order: {
        lastOrderDate: 'DESC',
      },
    });
  }

  /**
   * Cuenta el total de clientes guest
   */
  async count(): Promise<number> {
    return this.guestCustomerRepository.count();
  }
}

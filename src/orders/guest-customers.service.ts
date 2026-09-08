import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';
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
   * Crea o actualiza un cliente guest con la información de la orden
   */
  async createOrUpdate(
    customerInfo: CustomerInfoDto,
    shippingAddress?: ShippingAddressDto,
  ): Promise<GuestCustomer> {
    // Buscar si ya existe
    let guestCustomer = await this.findByIdentification(
      customerInfo.identificationType,
      customerInfo.identificationNumber,
    );

    if (guestCustomer) {
      // Actualizar datos del cliente
      guestCustomer.firstName = customerInfo.firstName;
      guestCustomer.lastName = customerInfo.lastName;
      guestCustomer.email = customerInfo.email;
      guestCustomer.phone = customerInfo.phone;

      // Actualizar dirección si se proporciona
      if (shippingAddress) {
        guestCustomer.address = shippingAddress.address;
        guestCustomer.city = shippingAddress.city;
        guestCustomer.state = shippingAddress.state;
        guestCustomer.zipCode = shippingAddress.zipCode;
        guestCustomer.country = shippingAddress.country || 'Venezuela';
        guestCustomer.additionalInfo = shippingAddress.additionalInfo;
        guestCustomer.latitude = shippingAddress.latitude;
        guestCustomer.longitude = shippingAddress.longitude;
      }

      guestCustomer.ordersCount += 1;
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
        address: shippingAddress?.address,
        city: shippingAddress?.city,
        state: shippingAddress?.state,
        zipCode: shippingAddress?.zipCode,
        country: shippingAddress?.country || 'Venezuela',
        additionalInfo: shippingAddress?.additionalInfo,
        latitude: shippingAddress?.latitude,
        longitude: shippingAddress?.longitude,
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

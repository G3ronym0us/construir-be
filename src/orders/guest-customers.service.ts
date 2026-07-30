import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';
import { CustomerInfoDto, ShippingAddressDto } from './dto/create-order.dto';

function normalizarEmail(valor?: string | null): string | null {
  const limpio = (valor ?? '').trim().toLowerCase();
  return limpio || null;
}

function normalizarTelefono(valor?: string | null): string | null {
  const digitos = (valor ?? '').replace(/\D/g, '');
  // Menos de 7 dígitos no identifica a nadie: se descarta para que dos valores
  // basura no se comparen como iguales.
  return digitos.length >= 7 ? digitos.slice(-10) : null;
}

@Injectable()
export class GuestCustomersService {
  constructor(
    @InjectRepository(GuestCustomer)
    private readonly guestCustomerRepository: Repository<GuestCustomer>,
  ) {}

  /**
   * Busca un cliente guest por su identificación.
   *
   * USO INTERNO ÚNICAMENTE. Buscar sólo por cédula es correcto para el alta de
   * una orden (`createOrUpdate`), donde el cliente ya demostró tener sus datos
   * porque acaba de escribirlos. No debe exponerse en una ruta pública: las
   * cédulas venezolanas son secuenciales, así que un endpoint que devuelva
   * datos personales a partir de una cédula sola permite recorrer el padrón
   * entero. Para el autocompletado público está `findForAutocomplete()`.
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
   * Busca un cliente guest para autocompletar el formulario de checkout,
   * exigiendo que quien consulta ya conozca un segundo dato del cliente.
   *
   * Devuelve el cliente sólo si la cédula existe **y** el correo o el teléfono
   * recibido coincide con el registrado. Con eso, conocer una cédula deja de
   * alcanzar para obtener nombre, correo, teléfono y domicilio de una persona.
   *
   * Devuelve `null` de forma indistinguible en los tres casos de fallo —cédula
   * inexistente, segundo dato ausente y segundo dato incorrecto— para no
   * convertirse en un oráculo que confirme qué cédulas están registradas.
   */
  async findForAutocomplete(
    identificationType: IdentificationType,
    identificationNumber: string,
    contacto: { email?: string; phone?: string },
  ): Promise<GuestCustomer | null> {
    if (!contacto.email && !contacto.phone) {
      return null;
    }

    const cliente = await this.findByIdentification(
      identificationType,
      identificationNumber,
    );

    if (!cliente) {
      return null;
    }

    // Cada comparación exige que el valor recibido normalice a algo real. Sin
    // esa condición, un dato en blanco contra un campo vacío del cliente daría
    // `null === null`, es decir una coincidencia falsa que reabriría el agujero.
    const emailRecibido = normalizarEmail(contacto.email);
    const coincideEmail =
      emailRecibido !== null &&
      emailRecibido === normalizarEmail(cliente.email);

    // Se comparan los últimos 10 dígitos para que '04141234567',
    // '+58 414 123 4567' y '414-1234567' se consideren el mismo número.
    const telefonoRecibido = normalizarTelefono(contacto.phone);
    const coincideTelefono =
      telefonoRecibido !== null &&
      telefonoRecibido === normalizarTelefono(cliente.phone);

    return coincideEmail || coincideTelefono ? cliente : null;
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

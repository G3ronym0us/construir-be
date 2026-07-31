import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuestCustomer, IdentificationType } from './guest-customer.entity';
import { CustomerInfoDto, ShippingAddressDto } from './dto/create-order.dto';

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
   * Basta la identificación: el comprador escribe su cédula y recupera sus
   * datos sin tener que recordar con qué correo o teléfono compró la vez
   * anterior. Es una decisión de producto deliberada.
   *
   * El riesgo que acepta es que las cédulas venezolanas son secuenciales, así
   * que quien recorra números en orden va obteniendo los datos de contacto de
   * cada cliente que haya comprado. La contención es el límite de tasa del
   * controlador, no esta consulta: mantenlo puesto.
   *
   * Devuelve `null` cuando la identificación no existe.
   */
  async findForAutocomplete(
    identificationType: IdentificationType,
    identificationNumber: string,
  ): Promise<GuestCustomer | null> {
    return this.findByIdentification(identificationType, identificationNumber);
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

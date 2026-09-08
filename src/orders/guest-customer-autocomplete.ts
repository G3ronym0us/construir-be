import { GuestCustomer } from './guest-customer.entity';

/**
 * Lo único que sale por la ruta pública de autocompletado.
 *
 * Antes se devolvía la entidad entera, y con ella cosas que el checkout no
 * usa para nada: el `id` correlativo, el `uuid` con el que el panel de
 * administración mueve al cliente, y las fechas de alta, actualización y
 * última compra. Un endpoint sin sesión no tiene por qué repartir los
 * identificadores internos ni el historial de nadie.
 *
 * `ordersCount` sí se queda: el aviso "Datos autocompletados · 3 pedidos
 * anteriores" del checkout lo pinta, y quitarlo era romper la pantalla.
 */
export interface GuestCustomerAutocomplete {
  identificationType: GuestCustomer['identificationType'];
  identificationNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  additionalInfo?: string;
  latitude?: number;
  longitude?: number;
  ordersCount: number;
}

/** Recorta la entidad a los campos que el formulario de checkout rellena. */
export function aAutocompletado(
  cliente: GuestCustomer,
): GuestCustomerAutocomplete {
  return {
    identificationType: cliente.identificationType,
    identificationNumber: cliente.identificationNumber,
    firstName: cliente.firstName,
    lastName: cliente.lastName,
    email: cliente.email,
    phone: cliente.phone,
    address: cliente.address,
    city: cliente.city,
    state: cliente.state,
    zipCode: cliente.zipCode,
    country: cliente.country,
    additionalInfo: cliente.additionalInfo,
    latitude: cliente.latitude,
    longitude: cliente.longitude,
    ordersCount: cliente.ordersCount,
  };
}

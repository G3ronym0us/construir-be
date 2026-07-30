import { ApiProperty } from '@nestjs/swagger';

/** Datos de contacto de la tienda física, servidos desde las variables STORE_*. */
export class StoreInfoResponseDto {
  @ApiProperty({ example: 'Construir' })
  name: string;

  @ApiProperty({ example: 'Av. Principal, Local #01' })
  address: string;

  @ApiProperty({ example: 'Ciudad Bolívar, Estado Bolívar' })
  city: string;

  @ApiProperty({ example: '+58 285 632 0178' })
  phone: string;

  @ApiProperty({
    example: 'info@constru-ir.com',
    description: 'Cadena vacía si no se configuró STORE_EMAIL',
  })
  email: string;

  @ApiProperty({ example: 'Lunes a Viernes: 8am - 6pm, Sábados: 9am - 2pm' })
  hours: string;

  @ApiProperty({
    example: 'https://maps.app.goo.gl/xxxxx',
    description: 'Cadena vacía si no se configuró STORE_MAP_URL',
  })
  mapUrl: string;
}

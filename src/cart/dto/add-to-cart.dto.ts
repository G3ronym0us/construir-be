import { IsInt, IsUUID, Min } from 'class-validator';

export class AddToCartDto {
  // `@IsUUID()` y no `@IsString()`: la columna `products.uuid` es de tipo
  // `uuid` en Postgres, así que buscar por un string que no lo sea (un id
  // numérico, un SKU, un slug) no devuelve "no encontrado" sino que revienta
  // la query con `invalid input syntax for type uuid` — 500 genérico en vez
  // del 404 que el frontend puede mostrar.
  @IsUUID()
  productUuid: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

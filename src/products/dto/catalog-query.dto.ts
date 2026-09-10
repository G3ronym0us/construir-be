import { BadRequestException } from '@nestjs/common';
import { Transform, plainToInstance } from 'class-transformer';
import {
  validateSync,
  IsBooleanString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { COLUMNAS_ORDENABLES } from '../sort.util';

/**
 * Parámetros de `GET /products`, el listado público del catálogo.
 *
 * Antes el controlador hacía `parseInt(page)` a pelo, así que `?page=0`,
 * `?page=-1` y `?page=abc` llegaban al servicio como 0, -1 y NaN y acababan en
 * un `skip` negativo o `NaN`: Postgres reventaba y el endpoint respondía **500**.
 * Es un endpoint público y sin autenticar, así que cualquiera podía provocarlo
 * con la URL. Ahora se valida y se responde 400.
 *
 * Ojo: este DTO NO se declara como tipo del `@Query()`, sino que se valida a
 * mano con `validarCatalogQuery`. Si se declarara, lo validaría también el
 * `ValidationPipe` global, que lleva `forbidNonWhitelisted: true` y devolvería
 * 400 ante cualquier parámetro de más en la URL: un `?utm_source=whatsapp`
 * pegado en un enlace compartido dejaría el catálogo en blanco. En una tienda
 * que se comparte por WhatsApp eso es justo el caso normal.
 */
export class CatalogQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser 1 o mayor' })
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser 1 o mayor' })
  // Tope para que nadie se traiga el catálogo entero de una sola petición.
  @Max(100, { message: 'limit no puede pasar de 100' })
  limit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsUUID('4', { message: 'categoryUuid debe ser un uuid' })
  categoryUuid?: string;

  @IsOptional()
  @IsBooleanString({ message: 'featured debe ser true o false' })
  featured?: string;

  /**
   * Precio mínimo en USD con IVA. Ver `FiltrosDeCatalogo` para por qué el
   * rango viaja en dólares y no en bolívares.
   *
   * `Number('')` da 0, así que un `?minPrice=` vacío — lo que produce un
   * formulario al que se le borra el campo — se trata como "sin filtro" en vez
   * de como "desde 0", que dejaría el parámetro pegado en la URL para siempre
   * sin filtrar nada.
   */
  @IsOptional()
  @Transform(({ value }) => precioOpcional(value))
  @IsNumber({}, { message: 'minPrice debe ser un número' })
  @Min(0, { message: 'minPrice no puede ser negativo' })
  @Max(1_000_000, { message: 'minPrice se sale del catálogo' })
  minPrice?: number;

  @IsOptional()
  @Transform(({ value }) => precioOpcional(value))
  @IsNumber({}, { message: 'maxPrice debe ser un número' })
  @Min(0, { message: 'maxPrice no puede ser negativo' })
  @Max(1_000_000, { message: 'maxPrice se sale del catálogo' })
  maxPrice?: number;

  /** Unidades mínimas en inventario. Ver `FiltrosDeCatalogo`. */
  @IsOptional()
  @Transform(({ value }) => precioOpcional(value))
  @IsInt({ message: 'minInventory debe ser un número entero' })
  @Min(0, { message: 'minInventory no puede ser negativo' })
  minInventory?: number;

  @IsOptional()
  @IsIn(COLUMNAS_ORDENABLES as unknown as string[], {
    message: `sortBy debe ser uno de: ${COLUMNAS_ORDENABLES.join(', ')}`,
  })
  sortBy?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(['ASC', 'DESC'], { message: 'sortOrder debe ser ASC o DESC' })
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Valida los parámetros del catálogo y devuelve el DTO ya convertido.
 *
 * Los parámetros que no conocemos se ignoran en silencio (ver arriba); los que
 * sí conocemos y vienen mal dan 400 en vez del 500 de antes.
 */
export function validarCatalogQuery(
  query: Record<string, unknown>,
): CatalogQueryDto {
  const dto = plainToInstance(CatalogQueryDto, query, {
    excludeExtraneousValues: false,
  });

  const errores = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: false,
    skipMissingProperties: true,
  });

  if (errores.length > 0) {
    throw new BadRequestException(
      errores.flatMap((error) => Object.values(error.constraints ?? {})),
    );
  }

  return dto;
}

/**
 * Convierte a número los parámetros numéricos opcionales de la URL.
 *
 * `undefined` y la cadena vacía significan "no vino el filtro", no "cero":
 * `Number('')` es 0 y con eso un `?minPrice=` vacío se habría interpretado
 * como "desde 0". Lo que no es un número (`?minPrice=abc`) se deja pasar tal
 * cual para que el validador lo rechace con un 400 explicando qué está mal.
 */
function precioOpcional(value: unknown): unknown {
  if (value === undefined || value === null || value === '') return undefined;
  const numero = Number(value);
  return Number.isNaN(numero) ? value : numero;
}

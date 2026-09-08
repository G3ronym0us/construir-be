import { BadRequestException } from '@nestjs/common';
import { Transform, plainToInstance } from 'class-transformer';
import {
  validateSync,
  IsBooleanString,
  IsIn,
  IsInt,
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

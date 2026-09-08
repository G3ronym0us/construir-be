import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo de `POST /analytics/page-view`.
 *
 * Los tres campos llegan del navegador sin ninguna sesión detrás, así que se
 * acotan a la longitud de su columna. Sin `@MaxLength` un cliente hostil metía
 * cadenas arbitrariamente largas: `path`, `title` y `referrer` reventaban el
 * varchar(500) con un error de base por cada visita, y `userAgent` —que es
 * `text`— dejaba escribir megabytes por petición en una tabla pública.
 */
export class CreatePageViewDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;
}

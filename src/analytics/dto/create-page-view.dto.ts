import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Cuerpo de `POST /analytics/page-view`.
 *
 * Los tres campos llegan del navegador sin ninguna sesión detrás, así que se
 * acotan a la longitud de su columna. Sin `@MaxLength` un cliente hostil metía
 * cadenas arbitrariamente largas que reventaban el varchar(500) con un error de
 * base por cada visita.
 *
 * **`userAgent` ya no está, y su ausencia es activa**: la validación global corre
 * con `forbidNonWhitelisted`, así que quien siga mandándolo recibe un 400. Es
 * deliberado —el campo no debe volver por inercia—, pero obliga a desplegar el
 * frontend antes que esto: un bundle viejo en caché seguiría mandándolo y
 * perdería sus visitas (el registro falla en silencio) hasta que el navegador
 * recargue.
 *
 * El `referrer` se acepta entero y lo recorta el servicio a su origen: esa regla
 * está escrita una sola vez, en `aOrigenDeReferrer`.
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
  @MaxLength(500)
  referrer?: string;
}

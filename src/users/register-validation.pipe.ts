import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validate } from 'class-validator';
import { CreateUserDto } from './dto/create-user.dto';
import { RegisterErrorCode } from './register-error-code.enum';

/**
 * Valida el cuerpo de `POST /users/register` devolviendo, además del mensaje,
 * un `code` estable con el motivo.
 *
 * El `ValidationPipe` global sirve para el resto de la API, pero su respuesta
 * es una lista de textos en inglés con redacción de log ("phone must be a
 * Venezuelan mobile number, password must be longer than or equal to 6
 * characters"). La pantalla de registro pintaba esa lista tal cual, así que al
 * cliente venezolano le tocaba adivinar qué campo tenía mal.
 *
 * El `code` sale del `context` que cada regla del DTO declara, no de buscar
 * texto en el mensaje: el día que alguien reescriba un mensaje, el frontend
 * sigue reconociendo el motivo.
 *
 * Por eso el controlador declara el cuerpo como `unknown`: si lo tipara como
 * `CreateUserDto`, el pipe global — que corre primero — validaría y lanzaría
 * el 400 sin `code` antes de que este pipe llegue a verlo.
 */
@Injectable()
export class RegisterValidationPipe implements PipeTransform {
  async transform(value: unknown) {
    const dto = plainToInstance(CreateUserDto, value ?? {});

    const errores = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errores.length > 0) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        // El `message` se conserva con el mismo formato que devolvía el pipe
        // global, para no romper a nadie que lo estuviera leyendo.
        message: mensajes(errores),
        code: codigoDeRechazo(errores),
      });
    }

    return dto;
  }
}

function mensajes(errores: ValidationError[]): string[] {
  return errores.flatMap((e) => Object.values(e.constraints ?? {}));
}

/**
 * El `code` de la primera regla que falló, en el orden en que están declaradas
 * en el DTO. Si ninguna lo declara, queda el genérico.
 */
export function codigoDeRechazo(errores: ValidationError[]): RegisterErrorCode {
  for (const error of errores) {
    const contextos = Object.values(error.contexts ?? {}) as {
      code?: RegisterErrorCode;
    }[];
    const conCodigo = contextos.find((c) => c?.code);
    if (conCodigo?.code) return conCodigo.code;
  }

  return RegisterErrorCode.INVALID_DATA;
}

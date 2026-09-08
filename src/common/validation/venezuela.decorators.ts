import {
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizarCedulaVE, normalizarTelefonoMovilVE } from './venezuela';

/**
 * Decoradores de DTO para cédula y teléfono venezolanos.
 *
 * La validación del frontend es una cortesía — avisa antes de enviar — pero no
 * es la que manda: cualquiera puede hablarle a esta API sin pasar por el
 * formulario. La regla vive acá.
 */

/**
 * Deja el teléfono en `04141234567` antes de validarlo y de guardarlo.
 *
 * Sin esto, el mismo número entraba a la base escrito de cinco maneras
 * distintas y buscar un cliente por teléfono no encontraba nada.
 */
export function NormalizaTelefonoMovilVE() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    // Si no se reconoce, se deja tal cual para que el validador lo rechace con
    // su mensaje; normalizarlo a `null` acá lo convertiría en "falta el campo".
    return normalizarTelefonoMovilVE(value) ?? value;
  });
}

/** Deja sólo los dígitos de la cédula: el tipo (V/E) viaja en su propio campo. */
export function NormalizaNumeroCedulaVE() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const canonico = normalizarCedulaVE(value);
    return canonico ? canonico.slice(2) : value.trim();
  });
}

export function EsTelefonoMovilVE(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'esTelefonoMovilVE',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate: (value: unknown) => normalizarTelefonoMovilVE(value) !== null,
        defaultMessage: () =>
          'phone must be a Venezuelan mobile number (0412, 0414, 0416, 0424 or 0426 + 7 digits)',
      },
    });
  };
}

/**
 * Valida el número de cédula contra el tipo que viaja en otro campo.
 *
 * Sólo se exige la forma de cédula cuando el tipo es V o E. Un RIF jurídico
 * (J), de gobierno (G) o un pasaporte (P) tienen otras reglas que acá no se
 * definen: aplicarles la de la cédula rechazaría compras de empresas que hoy
 * funcionan.
 */
export function EsNumeroCedulaVE(
  campoTipo: string,
  options?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'esNumeroCedulaVE',
      target: object.constructor,
      propertyName,
      constraints: [campoTipo],
      options,
      validator: {
        validate: (value: unknown, args: ValidationArguments) => {
          const tipo = (args.object as Record<string, unknown>)[
            args.constraints[0] as string
          ];
          if (tipo !== 'V' && tipo !== 'E') return true;
          const numero = typeof value === 'string' ? value : '';
          return normalizarCedulaVE(`${tipo}${numero}`) !== null;
        },
        defaultMessage: () =>
          'identificationNumber must be a Venezuelan ID number (7 or 8 digits)',
      },
    });
  };
}

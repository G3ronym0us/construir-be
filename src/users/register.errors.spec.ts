import { BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { RegisterValidationPipe } from './register-validation.pipe';
import { RegisterErrorCode } from './register-error-code.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { CompleteInvitationDto } from './dto/complete-invitation.dto';
import { IdentificationType } from '../orders/guest-customer.entity';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * La pantalla de registro pintaba tal cual el `message` de esta API: al
 * cliente venezolano le salía "Email already exists" o la lista cruda del
 * validador ("phone must be a Venezuelan mobile number, password must be
 * longer than or equal to 6 characters") — en inglés, aunque tuviera la tienda
 * en español, y sin decirle qué campo arreglar.
 *
 * Ahora el rechazo viaja con un `code`. Estas pruebas fijan ese contrato: si
 * alguien reescribe un mensaje, el `code` tiene que seguir siendo el mismo,
 * porque es lo único que el frontend sabe interpretar. Y de paso fijan que la
 * cédula y el teléfono se normalizan antes de guardarse: el mismo número
 * escrito de tres formas tiene que quedar igual en la base.
 */
describe('POST /users/register — validación y código del motivo de rechazo', () => {
  const pipe = new RegisterValidationPipe();
  const datos = (over: Record<string, unknown> = {}) => ({
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@correo.com',
    password: 'secreta',
    phone: '04141234567',
    identificationType: 'V',
    identificationNumber: '12345678',
    ...over,
  });

  /** El `code` del cuerpo del 400, o `null` si el cuerpo pasó la validación. */
  const codigoDe = async (
    over: Record<string, unknown>,
  ): Promise<string | null> => {
    try {
      await pipe.transform(datos(over));
      return null;
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const cuerpo = (e as BadRequestException).getResponse() as {
        code: string;
        message: string[];
      };
      // Nunca se devuelve un cuerpo sin mensaje: el `message` se conserva para
      // los logs y para clientes viejos que lo leían.
      expect(cuerpo.message.length).toBeGreaterThan(0);
      return cuerpo.code;
    }
  };

  it('acepta un registro correcto', async () => {
    await expect(pipe.transform(datos())).resolves.toBeInstanceOf(
      CreateUserDto,
    );
  });

  it('identifica el campo que está mal con un `code` estable', async () => {
    expect(await codigoDe({ email: 'no-es-un-correo' })).toBe(
      RegisterErrorCode.INVALID_EMAIL,
    );
    expect(await codigoDe({ password: '123' })).toBe(
      RegisterErrorCode.WEAK_PASSWORD,
    );
    expect(await codigoDe({ phone: '02121234567' })).toBe(
      RegisterErrorCode.INVALID_PHONE,
    );
    expect(await codigoDe({ identificationNumber: '123' })).toBe(
      RegisterErrorCode.INVALID_IDENTIFICATION,
    );
    expect(await codigoDe({ firstName: '' })).toBe(
      RegisterErrorCode.MISSING_FIELDS,
    );
  });

  describe('teléfono', () => {
    it('acepta las cinco operadoras móviles, escritas como sea', async () => {
      for (const escrito of [
        '04121234567',
        '0414-1234567',
        '0416 123 45 67',
        '+58 424 1234567',
        '04261234567',
      ]) {
        expect(await codigoDe({ phone: escrito })).toBeNull();
      }
    });

    it('guarda siempre el mismo formato', async () => {
      const dto = await pipe.transform(datos({ phone: '+58 414-123.45.67' }));
      expect(dto.phone).toBe('04141234567');
    });

    it('rechaza fijos, prefijos inexistentes y texto', async () => {
      for (const malo of [
        '02121234567',
        '02411234567',
        '04151234567',
        '0414123456',
        '041412345678',
        'asdf',
      ]) {
        expect(await codigoDe({ phone: malo })).toBe(
          RegisterErrorCode.INVALID_PHONE,
        );
      }
    });
  });

  it('exige cédula y teléfono, no sólo el formulario', async () => {
    // Mientras fueron opcionales, cualquiera que le hablara a esta API sin
    // pasar por la pantalla podía crear una cuenta sin forma de contactarlo:
    // llegaba al panel un pedido de alguien a quien no se puede llamar.
    // Se llama al pipe con el cuerpo recortado, no con `codigoDe`: ése parte de
    // un cuerpo completo y volvería a rellenar el campo que se quiere quitar.
    const sinElCampo = async (falta: string): Promise<string | null> => {
      const cuerpo = datos();
      delete (cuerpo as Record<string, unknown>)[falta];
      try {
        await pipe.transform(cuerpo);
        return null;
      } catch (e) {
        return ((e as BadRequestException).getResponse() as { code: string })
          .code;
      }
    };

    expect(await sinElCampo('phone')).toBe(RegisterErrorCode.INVALID_PHONE);
    expect(await sinElCampo('identificationType')).toBe(
      RegisterErrorCode.INVALID_IDENTIFICATION,
    );
    expect(await sinElCampo('identificationNumber')).toBe(
      RegisterErrorCode.INVALID_IDENTIFICATION,
    );
  });

  it('no deja que un nombre desmedido entre entero', async () => {
    // `first_name` es un `varchar` sin tope en la base, así que 2000 caracteres
    // se guardaban y salían después en los correos y en el panel.
    expect(await codigoDe({ firstName: 'A'.repeat(2000) })).toBe(
      RegisterErrorCode.MISSING_FIELDS,
    );
    expect(await codigoDe({ lastName: 'A'.repeat(2000) })).toBe(
      RegisterErrorCode.MISSING_FIELDS,
    );
  });

  it('no deja que el registro se conceda a sí mismo rol ni cuenta activa', async () => {
    // `POST /users/register` es público: lo único que impide que alguien se
    // registre como `admin`, con la cuenta ya verificada o con otro `id`, es
    // que el validador rechace toda propiedad que el DTO no declara.
    //
    // Este pipe reemplazó al `ValidationPipe` global para esta ruta. Si alguien
    // lo simplifica mañana y se lleva por delante `whitelist` /
    // `forbidNonWhitelisted`, ninguna otra prueba se quejaría y el agujero se
    // abriría en silencio.
    for (const colado of [
      { role: 'admin' },
      { isActive: true },
      { emailVerified: true, id: 999 },
      { password: 'secreta', deletedAt: null },
    ]) {
      expect(await codigoDe(colado)).toBe(RegisterErrorCode.INVALID_DATA);
    }
  });

  describe('cédula', () => {
    it('acepta 7 y 8 dígitos, con guion, sin guion y en minúscula', async () => {
      for (const escrito of [
        '12345678',
        '1234567',
        'V-12345678',
        'v12345678',
        '12.345.678',
      ]) {
        expect(await codigoDe({ identificationNumber: escrito })).toBeNull();
      }
    });

    it('guarda sólo los dígitos: el tipo va en su propio campo', async () => {
      const dto = await pipe.transform(
        datos({ identificationNumber: 'v-12.345.678' }),
      );
      expect(dto.identificationNumber).toBe('12345678');
    });

    it('rechaza lo que no tiene forma de cédula', async () => {
      for (const malo of ['123', '123456789', 'ABC12345', '']) {
        expect(await codigoDe({ identificationNumber: malo })).toBe(
          RegisterErrorCode.INVALID_IDENTIFICATION,
        );
      }
    });

    it('exige que sea texto aunque el tipo no sea V ni E', async () => {
      // `EsNumeroCedulaVE` da por buena la identificación de un RIF o un
      // pasaporte —tienen otras reglas—, así que sin `@IsString()` un objeto,
      // un array o un número entraban con 201 y se guardaban como basura.
      for (const malo of [{ a: 1 }, [1, 2, 3], 12345678, true]) {
        expect(
          await codigoDe({
            identificationType: 'J',
            identificationNumber: malo,
          }),
        ).toBe(RegisterErrorCode.INVALID_IDENTIFICATION);
      }
    });

    it('no deja pasar una identificación más larga que su columna', async () => {
      // `varchar(50)`: sin el tope, el cliente recibía un 500 del motor de base
      // de datos en vez de un aviso de que su dato está mal.
      expect(
        await codigoDe({
          identificationType: 'J',
          identificationNumber: '4'.repeat(2000),
        }),
      ).toBe(RegisterErrorCode.INVALID_IDENTIFICATION);
    });

    it('no le aplica la regla de la cédula a un RIF o a un pasaporte', async () => {
      // Un jurídico (J) o un pasaporte (P) tienen otras reglas que acá no se
      // definen. Aplicarles la de la cédula rechazaría compras de empresas que
      // hoy funcionan.
      expect(
        await codigoDe({
          identificationType: 'J',
          identificationNumber: '123456789',
        }),
      ).toBeNull();
      expect(
        await codigoDe({
          identificationType: 'P',
          identificationNumber: 'AB123456',
        }),
      ).toBeNull();
    });
  });
});

describe('UsersService.create — correo ya registrado', () => {
  it('rechaza con un `code` estable en vez de sólo "Email already exists"', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, email: 'ana@correo.com' }),
    };
    const service = new UsersService(repo as never, {} as never, {} as never);

    let error: unknown;
    try {
      await service.create({
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@correo.com',
        password: 'secreta',
        phone: '04141234567',
        identificationType: IdentificationType.V,
        identificationNumber: '12345678',
      });
    } catch (e) {
      error = e;
    }

    expect(error).toBeInstanceOf(ConflictException);
    const cuerpo = (error as ConflictException).getResponse() as {
      code: string;
      message: string;
    };
    expect(cuerpo.code).toBe(RegisterErrorCode.EMAIL_ALREADY_REGISTERED);
    // El texto se conserva para no romper a clientes que lo leían.
    expect(cuerpo.message).toBe('Email already exists');
  });
});

/**
 * Las tres puertas por las que se crea un usuario —el registro público, el alta
 * por invitación y el alta desde el panel— llenan la MISMA tabla. Cada una
 * tenía su propio criterio: sólo el registro miraba el teléfono y la cédula, y
 * las otras dos ni siquiera aceptaban esos campos. El resultado era una tabla
 * con el mismo dato guardado de varias formas según por dónde hubiera entrado
 * cada quien.
 *
 * Esta prueba es la que evita que vuelvan a divergir: las tres comparten los
 * mismos decoradores, así que las tres tienen que aceptar y rechazar lo mismo.
 * Lo que sí difiere a propósito es la obligatoriedad —a un empleado invitado no
 * se le exige la cédula—, y eso también queda fijado abajo.
 */
describe('las tres puertas de alta aplican la misma regla', () => {
  const puertas = [
    {
      nombre: 'registro público',
      dto: CreateUserDto as ClassConstructor<object>,
      base: {
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@correo.com',
        password: 'secreta',
        phone: '04141234567',
        identificationType: 'V',
        identificationNumber: '12345678',
      },
      exigeIdentificacion: true,
    },
    {
      nombre: 'alta desde el panel',
      dto: CreateUserAdminDto as ClassConstructor<object>,
      base: {
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@correo.com',
        password: 'secreta',
        role: 'customer',
      },
      exigeIdentificacion: false,
    },
    {
      nombre: 'alta por invitación',
      dto: CompleteInvitationDto as ClassConstructor<object>,
      base: {
        token: 'un-token',
        firstName: 'Ana',
        lastName: 'Pérez',
        password: 'secreta',
      },
      exigeIdentificacion: false,
    },
  ];

  /** Propiedades que fallaron la validación de esa puerta con ese cuerpo. */
  const fallan = async (
    puerta: (typeof puertas)[number],
    over: Record<string, unknown>,
  ): Promise<string[]> => {
    const instancia = plainToInstance(puerta.dto, { ...puerta.base, ...over });
    const errores = await validate(instancia);
    return errores.map((e) => e.property);
  };

  for (const puerta of puertas) {
    describe(puerta.nombre, () => {
      it('acepta el mismo teléfono escrito de cualquier forma y lo normaliza igual', async () => {
        for (const escrito of [
          '04141234567',
          '0414-1234567',
          '+58 (0414) 1234567',
          '5804141234567',
        ]) {
          expect(await fallan(puerta, { phone: escrito })).toEqual([]);
        }

        const instancia = plainToInstance(puerta.dto, {
          ...puerta.base,
          phone: '+58 414-123.45.67',
        }) as { phone?: string };
        expect(instancia.phone).toBe('04141234567');
      });

      it('rechaza el mismo teléfono malo', async () => {
        for (const malo of ['02121234567', '04151234567', 'asdf']) {
          expect(await fallan(puerta, { phone: malo })).toContain('phone');
        }
      });

      it('acepta la misma cédula escrita de cualquier forma y la normaliza igual', async () => {
        for (const escrito of ['12345678', 'V-12345678', 'v12.345.678']) {
          expect(
            await fallan(puerta, {
              identificationType: 'V',
              identificationNumber: escrito,
            }),
          ).toEqual([]);
        }

        const instancia = plainToInstance(puerta.dto, {
          ...puerta.base,
          identificationType: 'V',
          identificationNumber: 'v-12.345.678',
        }) as { identificationNumber?: string };
        expect(instancia.identificationNumber).toBe('12345678');
      });

      it('rechaza la misma cédula mala', async () => {
        for (const malo of ['123', '123456789', 'ABC12345']) {
          expect(
            await fallan(puerta, {
              identificationType: 'V',
              identificationNumber: malo,
            }),
          ).toContain('identificationNumber');
        }
      });

      it('deja en paz al RIF y al pasaporte, igual que las demás', async () => {
        // La decisión de no ponerle regla propia a J, G y P vale para las tres
        // puertas: si una empezara a exigirla, bloquearía a las empresas sólo
        // según por dónde entraran.
        expect(
          await fallan(puerta, {
            identificationType: 'J',
            identificationNumber: '409876543',
          }),
        ).toEqual([]);
      });

      it('corta los nombres desmedidos', async () => {
        expect(await fallan(puerta, { firstName: 'A'.repeat(2000) })).toContain(
          'firstName',
        );
      });

      it(
        puerta.exigeIdentificacion
          ? 'exige teléfono y cédula'
          : 'no exige teléfono ni cédula: por aquí entra personal interno',
        async () => {
          const sinDatos = await fallan(puerta, {
            phone: undefined,
            identificationType: undefined,
            identificationNumber: undefined,
          });

          if (puerta.exigeIdentificacion) {
            expect(sinDatos).toContain('phone');
            expect(sinDatos).toContain('identificationNumber');
          } else {
            expect(sinDatos).toEqual([]);
          }
        },
      );
    });
  }
});

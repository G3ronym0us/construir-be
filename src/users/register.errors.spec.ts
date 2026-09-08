import { BadRequestException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { RegisterValidationPipe } from './register-validation.pipe';
import { RegisterErrorCode } from './register-error-code.enum';
import { CreateUserDto } from './dto/create-user.dto';

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

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigType } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { jwtConfig } from '../../config/configuration';
import { extraerTokenDeCookie } from './jwt-cookie.extractor';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    @Inject(jwtConfig.KEY)
    private jwt: ConfigType<typeof jwtConfig>,
  ) {
    super({
      // La cabecera `Authorization` va PRIMERO, y el orden importa: un
      // navegador nunca la manda sola, así que si viene es porque alguien la
      // puso a mano y quiere usar ESE token. Con la cookie primero, una cookie
      // vieja o inválida en la misma sesión tapaba un `Bearer` válido y la
      // respuesta era 401 sin explicación — media hora de depuración para
      // quien prueba con Postman en el navegador donde ya inició sesión.
      //
      // La cabecera se conserva a propósito, además: la usan la colección de
      // Postman, los scripts de mantenimiento y las pruebas. La vulnerabilidad
      // que se está cerrando es guardar el token donde el JavaScript de la
      // página lo alcanza (`localStorage`, `document.cookie`), no la cabecera
      // en sí — quien manda un `Bearer` ya tiene el token en la mano.
      //
      // La cookie `httpOnly` es la sesión del navegador y cubre todo lo demás.
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extraerTokenDeCookie,
      ]),
      ignoreExpiration: false,
      secretOrKey: jwt.secret,
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    // La identidad sale del token y el perfil de la fila que se acaba de
    // cargar. El token se firma una vez y dura 24 h, así que un dato que
    // cambie —o que se complete después, como la cédula— quedaría viejo ahí
    // dentro hasta el próximo login.
    //
    // El checkout necesita saber si la cuenta tiene cédula y teléfono para
    // pedírselos sólo a quien le falten; sin esto no podía distinguirlo y los
    // pedidos de clientes con sesión llegaban al ERP sin identificación.
    return {
      userId: payload.sub,
      id: payload.sub,
      uuid: payload.uuid,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      phone: user.phone ?? null,
      identificationType: user.identificationType ?? null,
      identificationNumber: user.identificationNumber ?? null,
    };
  }
}

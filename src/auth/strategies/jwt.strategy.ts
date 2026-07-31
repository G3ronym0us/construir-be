import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigType } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { jwtConfig } from '../../config/configuration';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    @Inject(jwtConfig.KEY)
    private jwt: ConfigType<typeof jwtConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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

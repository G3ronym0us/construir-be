import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordTokenDto } from './dto/reset-password-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { jwtConfig } from '../config/configuration';
import {
  SESSION_COOKIE_NAME,
  opcionesCookieSesion,
  opcionesBorradoSesion,
  type OpcionesSesion,
} from './session-cookie';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    @Inject(jwtConfig.KEY)
    private readonly jwt: ConfigType<typeof jwtConfig>,
  ) {}

  /**
   * Atributos de la cookie de sesión, resueltos desde el entorno.
   *
   * `COOKIE_SAMESITE` existe porque `Lax` sólo alcanza si la tienda y la API
   * comparten dominio registrable (`tienda.com` y `api.tienda.com`). Si el
   * dueño despliega la API en otro dominio, el navegador deja de mandar la
   * cookie y NADIE puede entrar; ahí hace falta `none` + HTTPS.
   */
  private get opcionesSesion(): OpcionesSesion {
    return {
      expiresIn: this.jwt.expiresIn,
      produccion: process.env.NODE_ENV === 'production',
      sameSite: process.env.COOKIE_SAMESITE,
      domain: process.env.COOKIE_DOMAIN,
    };
  }

  /**
   * 10 intentos por minuto y por origen. No tenía ninguno.
   *
   * Sin límite esto es un probador de contraseñas: la ruta es pública, no
   * cuesta nada y responde distinto según acierte, así que un diccionario
   * contra `admin@construir.com` corría a la velocidad de la red. 10 por
   * minuto lo deja en un ritmo con el que un diccionario decente tarda años.
   *
   * 10 y no 5 porque acá el que se equivoca es una persona real que no
   * recuerda su contraseña, y echarla del login es echarla de la tienda.
   * Diez intentos en un minuto son más de los que da nadie a mano.
   *
   * El techo es por origen, no por cuenta: cuenta también los intentos contra
   * cuentas distintas desde la misma IP, que es la forma que tiene el rociado
   * de contraseñas de esquivar un bloqueo por usuario.
   */
  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.authService.login(loginDto);

    // La sesión del navegador queda acá, en una cookie que el JavaScript de la
    // página no puede leer. Antes el frontend guardaba este mismo token en
    // `localStorage` y en una cookie escrita con `document.cookie`, así que un
    // XSS —o una dependencia comprometida— se llevaba la sesión de un cliente
    // o de un administrador completa.
    res.cookie(
      SESSION_COOKIE_NAME,
      resultado.access_token,
      opcionesCookieSesion(this.opcionesSesion),
    );

    // El `access_token` sigue en el cuerpo para que Postman, los scripts y las
    // pruebas puedan seguir usando la cabecera `Authorization`. El frontend ya
    // NO lo guarda: se apoya sólo en la cookie.
    return resultado;
  }

  /**
   * Cierra la sesión borrando la cookie desde el servidor.
   *
   * Hace falta un endpoint porque una cookie `httpOnly` no la puede borrar el
   * JavaScript del cliente: hasta ahora el `logout` hacía `document.cookie` con
   * `max-age=0` y eso ya no tiene efecto sobre esta cookie.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    // Sin `JwtAuthGuard` a propósito: salir tiene que funcionar también cuando
    // el token ya venció. Con el guard, una sesión caducada respondía 401 y la
    // cookie muerta se quedaba pegada en el navegador.
    res.clearCookie(
      SESSION_COOKIE_NAME,
      opcionesBorradoSesion(this.opcionesSesion),
    );
    return { message: 'Sesión cerrada.' };
  }

  /**
   * 5 por minuto y por origen. No tenía ninguno, y es un emisor de correo
   * anónimo: cada llamada manda un correo a la dirección que ponga quien
   * llama. Sin techo eso es bombardear el buzón de un cliente desde el
   * dominio de la tienda hasta que el proveedor de correo la marque como
   * emisora de spam — se pierde el remitente, y con él los correos de
   * confirmación de pedido, que es el canal por el que la tienda cobra.
   *
   * 5 no molesta a nadie: quien olvidó la contraseña pide el enlace una vez, y
   * como mucho lo repite porque no le llegó.
   *
   * La respuesta ya es la misma exista o no el correo, así que esto no es la
   * defensa contra la enumeración de cuentas; es la defensa contra el
   * bombardeo.
   */
  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.usersService.requestPasswordReset(dto.email);
    return {
      message:
        'Si el correo existe, recibirás un enlace para restablecer tu contraseña.',
    };
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordTokenDto) {
    await this.usersService.confirmPasswordReset(dto.token, dto.newPassword);
    return { message: 'Contraseña actualizada correctamente.' };
  }

  /**
   * Metadata del enlace de recuperación. Público, como el de invitación.
   */
  @Get('reset-password/:token')
  async getResetTokenInfo(@Param('token') token: string) {
    return this.usersService.getResetTokenInfo(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}

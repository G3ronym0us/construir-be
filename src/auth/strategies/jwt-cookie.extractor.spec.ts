import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { extraerTokenDeCookie } from './jwt-cookie.extractor';

/**
 * La estrategia JWT sólo miraba la cabecera `Authorization`. Al mover la
 * sesión del navegador a una cookie `httpOnly`, si el token no se extrae
 * también de ahí NADIE puede entrar: ni la tienda ni el panel.
 *
 * Y a la inversa: la cabecera tiene que seguir sirviendo, porque la usan la
 * colección de Postman y los scripts de mantenimiento. Estas pruebas fijan las
 * dos mitades, que es lo que se rompe si alguien "simplifica" el extractor.
 */
describe('Extracción del JWT — cookie y cabecera', () => {
  const pedido = (headers: Record<string, string>) =>
    ({ headers }) as unknown as Request;

  it('saca el token de la cookie de sesión', () => {
    expect(
      extraerTokenDeCookie(pedido({ cookie: 'token=abc.def.ghi' })),
    ).toBe('abc.def.ghi');
  });

  it('lo encuentra entre otras cookies del sitio', () => {
    // El navegador manda todas juntas: la de idioma, la de analítica, etc.
    expect(
      extraerTokenDeCookie(
        pedido({ cookie: 'NEXT_LOCALE=es; token=abc.def.ghi; otra=1' }),
      ),
    ).toBe('abc.def.ghi');
  });

  it('no confunde una cookie cuyo nombre TERMINA en `token`', () => {
    // `csrf_token=...` empieza a existir en cuanto alguien agregue CSRF; con
    // una comparación por `includes` se habría tomado ese valor como la sesión
    // y todo el mundo se quedaba fuera.
    expect(
      extraerTokenDeCookie(pedido({ cookie: 'csrf_token=xyz' })),
    ).toBeNull();
  });

  it('trata la cookie recién borrada como "sin sesión"', () => {
    // Tras el logout llega `token=`. Devolver la cadena vacía hacía que
    // passport intentara verificar "" y contestara 500 en vez de 401.
    expect(extraerTokenDeCookie(pedido({ cookie: 'token=' }))).toBeNull();
  });

  it('devuelve null cuando no hay cabecera `Cookie`', () => {
    expect(extraerTokenDeCookie(pedido({}))).toBeNull();
  });

  it('respeta un `req.cookies` ya parseado', () => {
    // Por si alguien monta `cookie-parser` más adelante.
    const req = {
      headers: {},
      cookies: { token: 'desde.cookie.parser' },
    } as unknown as Request;
    expect(extraerTokenDeCookie(req)).toBe('desde.cookie.parser');
  });

  it('la cabecera `Authorization` sigue siendo una fuente válida', () => {
    // Postman y los scripts mandan `Bearer`; quitarles esto los rompía sin
    // ganar nada — quien manda el token en una cabecera ya lo tiene.
    const desdeCabecera = ExtractJwt.fromAuthHeaderAsBearerToken();
    expect(
      desdeCabecera(pedido({ authorization: 'Bearer abc.def.ghi' })),
    ).toBe('abc.def.ghi');
  });

  it('la cookie gana sobre la cabecera cuando llegan las dos', () => {
    // Orden del `fromExtractors` de la estrategia: la sesión del navegador
    // manda. Se comprueba acá porque es el orden lo que decide el
    // comportamiento, y es trivial invertirlo sin darse cuenta.
    const req = pedido({
      cookie: 'token=desde.cookie',
      authorization: 'Bearer desde.cabecera',
    });
    const combinado = ExtractJwt.fromExtractors([
      extraerTokenDeCookie,
      ExtractJwt.fromAuthHeaderAsBearerToken(),
    ]);
    expect(combinado(req)).toBe('desde.cookie');
  });

  it('cae a la cabecera si la cookie no está', () => {
    const combinado = ExtractJwt.fromExtractors([
      extraerTokenDeCookie,
      ExtractJwt.fromAuthHeaderAsBearerToken(),
    ]);
    expect(
      combinado(pedido({ authorization: 'Bearer desde.cabecera' })),
    ).toBe('desde.cabecera');
  });
});

import {
  normalizarCedulaVE,
  normalizarCedulaVEDesdePartes,
  normalizarTelefonoMovilVE,
  normalizarTelefonoParaComparar,
} from './venezuela';

/**
 * Ni la cédula ni el teléfono se validaban al registrarse. El cliente podía
 * dejar "asdf" de teléfono y una cédula de tres dígitos, y eso se descubría
 * cuando el despachador intentaba llamarlo para coordinar la entrega.
 *
 * Estas pruebas fijan las dos mitades del trato: qué se acepta —porque la
 * gente escribe los números de muchas formas y rechazar algo interpretable es
 * un cliente perdido— y qué NO, para que nadie afloje la regla sin darse
 * cuenta.
 */
describe('normalizarTelefonoMovilVE', () => {
  it('acepta las formas en que la gente escribe su móvil y las guarda igual', () => {
    // Todas son el mismo número. Antes entraban a la base escritas de cinco
    // maneras distintas y buscar un cliente por teléfono no encontraba nada.
    for (const escrito of [
      '04141234567',
      '0414-1234567',
      '0414 123 45 67',
      '0414.123.4567',
      '(0414) 1234567',
      '+58 414 1234567',
      '584141234567',
      '4141234567',
      // Código de país y encima el 0 de la numeración local: es como lo copia
      // la gente de su propio contacto de WhatsApp. Se rechazaba porque al
      // quitar el `58` quedaba `004141234567`.
      '+58 (0414) 1234567',
      '+58 0414 123 45 67',
      '5804141234567',
      // La raya larga que pega Word o el teclado del móvil.
      '0414\u20131234567',
    ]) {
      expect(normalizarTelefonoMovilVE(escrito)).toBe('04141234567');
    }
  });

  it('deja fuera el prefijo internacional escrito con 00', () => {
    // `0058...` no lo escribe nadie y aceptarlo abriría la puerta a cualquier
    // cosa que empiece por ceros.
    expect(normalizarTelefonoMovilVE('0058 414 1234567')).toBeNull();
    expect(normalizarTelefonoMovilVE('004141234567')).toBeNull();
  });

  it('acepta las cinco operadoras móviles', () => {
    for (const prefijo of ['0412', '0414', '0416', '0424', '0426']) {
      expect(normalizarTelefonoMovilVE(`${prefijo}1234567`)).toBe(
        `${prefijo}1234567`,
      );
    }
  });

  it('rechaza lo que no es un móvil venezolano', () => {
    // Fijos de Caracas y Valencia: no sirven para coordinar una entrega ni
    // para confirmar un pago móvil, que es para lo que se pide el número.
    expect(normalizarTelefonoMovilVE('02121234567')).toBeNull();
    expect(normalizarTelefonoMovilVE('02411234567')).toBeNull();
    // Prefijo móvil inexistente.
    expect(normalizarTelefonoMovilVE('04151234567')).toBeNull();
    // Dígitos de menos y de más.
    expect(normalizarTelefonoMovilVE('0414123456')).toBeNull();
    expect(normalizarTelefonoMovilVE('041412345678')).toBeNull();
    // Texto suelto y vacíos.
    expect(normalizarTelefonoMovilVE('asdf')).toBeNull();
    expect(normalizarTelefonoMovilVE('')).toBeNull();
    expect(normalizarTelefonoMovilVE(undefined)).toBeNull();
    expect(normalizarTelefonoMovilVE(4141234567)).toBeNull();
  });
});

describe('normalizarCedulaVE', () => {
  it('acepta con guion, sin guion, en minúscula y con puntos', () => {
    for (const escrito of [
      'V-12345678',
      'v12345678',
      'V 12.345.678',
      '12345678',
      ' v-12345678 ',
      // La misma raya larga que el teléfono ya aceptaba. Que una la tragara y
      // la otra no era una asimetría sin motivo.
      'V\u201312345678',
      'V\u201412345678',
    ]) {
      expect(normalizarCedulaVE(escrito)).toBe('V-12345678');
    }
  });

  it('conserva el prefijo E de los extranjeros', () => {
    expect(normalizarCedulaVE('e-12345678')).toBe('E-12345678');
    expect(normalizarCedulaVE('E12345678')).toBe('E-12345678');
  });

  it('acepta 7 dígitos además de 8', () => {
    // Las cédulas viejas tienen siete. Exigir ocho dejaba fuera a los clientes
    // de más edad.
    expect(normalizarCedulaVE('V-1234567')).toBe('V-1234567');
  });

  it('rechaza lo que no es una cédula', () => {
    expect(normalizarCedulaVE('123456')).toBeNull();
    expect(normalizarCedulaVE('123456789')).toBeNull();
    expect(normalizarCedulaVE('J-123456789')).toBeNull();
    expect(normalizarCedulaVE('V-1234567A')).toBeNull();
    expect(normalizarCedulaVE('')).toBeNull();
    expect(normalizarCedulaVE(null)).toBeNull();
  });
});

describe('normalizarCedulaVEDesdePartes', () => {
  it('une el tipo del `select` con el número del campo de al lado', () => {
    expect(normalizarCedulaVEDesdePartes('V', '12345678')).toBe('V-12345678');
    expect(normalizarCedulaVEDesdePartes('E', '1234567')).toBe('E-1234567');
  });

  it('no se rompe si el cliente pega la cédula completa en el número', () => {
    // Pasa todo el tiempo: el `select` ya dice V y aun así pegan "V-12345678".
    expect(normalizarCedulaVEDesdePartes('V', 'V-12345678')).toBe('V-12345678');
    expect(normalizarCedulaVEDesdePartes('E', 'e12345678')).toBe('E-12345678');
  });

  it('rechaza el número mal formado', () => {
    expect(normalizarCedulaVEDesdePartes('V', '123')).toBeNull();
    expect(normalizarCedulaVEDesdePartes('V', '')).toBeNull();
  });
});

/**
 * El buscador de invitados del checkout usa el teléfono como segundo dato para
 * que la cédula sola no entregue la ficha de un comprador. Para eso hay que
 * cotejar el teléfono que teclea el cliente con el que está guardado, y en
 * `guest_customers` hay números cargados desde antes de que se validara nada.
 *
 * Estas pruebas evitan dos regresiones opuestas: que un cliente viejo con un
 * teléfono no venezolano quede encerrado fuera de su propio autocompletado, y
 * que un valor inservible ("", "asdf") se cuele como coincidencia por el
 * camino de "los dos normalizan a null".
 */
describe('normalizarTelefonoParaComparar', () => {
  it('reduce a la misma forma un móvil venezolano escrito de cualquier manera', () => {
    for (const escrito of [
      '04141234567',
      '0414-1234567',
      '+58 414 1234567',
      '4141234567',
    ]) {
      expect(normalizarTelefonoParaComparar(escrito)).toBe('04141234567');
    }
  });

  it('deja comparables los teléfonos viejos que no son móviles venezolanos', () => {
    // Sin esto, el cliente que compró con "+1 (406) 729-6503" no volvería a
    // reconocerse a sí mismo nunca más.
    expect(normalizarTelefonoParaComparar('+1 (406) 729-6503')).toBe(
      '14067296503',
    );
    expect(normalizarTelefonoParaComparar('14067296503')).toBe('14067296503');
  });

  it('no da nada comparable con lo que no identifica a nadie', () => {
    // Un "123" no puede servir de segundo factor, y quien devuelva null aquí
    // NUNCA debe tratarse como igual a otro null.
    for (const basura of ['', '   ', 'asdf', '123', null, undefined, 12345678]) {
      expect(normalizarTelefonoParaComparar(basura)).toBeNull();
    }
  });
});

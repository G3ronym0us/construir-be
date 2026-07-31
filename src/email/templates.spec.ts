import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

const DIR = path.join(__dirname, 'templates');

/**
 * No comprueba el contenido: sólo que cada plantilla sea Handlebars válido y
 * que sus parciales existan. Las pruebas de payload, una por correo, verifican
 * después que no falte ninguna variable.
 */
describe('plantillas de correo', () => {
  beforeAll(() => {
    const partials = path.join(DIR, 'partials');
    for (const file of fs.readdirSync(partials)) {
      handlebars.registerPartial(
        path.basename(file, '.hbs'),
        fs.readFileSync(path.join(partials, file), 'utf-8'),
      );
    }
    handlebars.registerHelper('concat', (...args: unknown[]) =>
      args.slice(0, -1).join(''),
    );
  });

  const plantillas = fs.readdirSync(DIR).filter((f) => f.endsWith('.hbs'));

  it('están todas las que el servicio espera', () => {
    expect(plantillas.sort()).toEqual([
      'admin-new-order.hbs',
      'email-verification.hbs',
      'invitation.hbs',
      'order-confirmation.hbs',
      'order-ready-for-pickup.hbs',
      'order-shipped.hbs',
      'password-reset.hbs',
      'payment-confirmed.hbs',
      'payment-rejected.hbs',
      'welcome.hbs',
    ]);
  });

  it.each(fs.readdirSync(DIR).filter((f) => f.endsWith('.hbs')))(
    '%s compila',
    (archivo) => {
      const fuente = fs.readFileSync(path.join(DIR, archivo), 'utf-8');

      // `handlebars.compile` es perezoso: no parsea la fuente hasta que se
      // invoca la función que devuelve. Un `{{#if}}` sin cerrar o un parcial
      // inexistente no lanzan al compilar, sólo al ejecutar. Por eso hay que
      // invocar el template (con un payload vacío alcanza, ya que en modo no
      // estricto Handlebars rinde las variables ausentes como cadena vacía).
      expect(() => handlebars.compile(fuente)({})).not.toThrow();
    },
  );
});

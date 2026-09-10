import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import * as ts from 'typescript';

/**
 * Guardián contra la reincidencia del fallo de serialización.
 *
 * # Qué fallaba
 *
 * `ClassSerializerInterceptor` recorta la respuesta con `instanceToPlain`, y
 * `instanceToPlain` decide qué quitar mirando la CLASE del valor que le llega:
 * si el objeto no es instancia de la entidad, no hay metadatos que consultar y
 * **ningún `@Exclude()` se aplica**.
 *
 * El desarmado con resto —`const { password, ...result } = user; return
 * result;`— produce exactamente eso: un `Object` pelado. Parecía la línea
 * segura del controlador y era la que abría el agujero. Medido contra el
 * servidor antes del arreglo, `GET /users/profile` y `GET /users/admin/users`
 * devolvían `id`, `emailVerificationToken` y `passwordResetToken` —los tres
 * con `@Exclude()` en `user.entity.ts`— porque el spread los desarmaba; sólo
 * se iba `password`, el único que la mano había nombrado.
 *
 * # Por qué esta prueba y no otra cosa
 *
 * El arreglo campo por campo no se sostiene solo: mañana alguien agrega una
 * ruta con el mismo `{ x, ...resto }` —es el modismo natural para "devolver
 * todo menos esto"— y el agujero vuelve **en silencio**, porque la respuesta
 * sigue teniendo buena pinta y ninguna prueba de negocio se entera.
 *
 * Lo que se prohíbe es el CONSTRUCTO, no cada campo: en un controlador,
 * desarmar con resto es siempre sospechoso, porque lo que ahí se devuelve es
 * la respuesta HTTP. Para quitar un campo hay dos formas que sí conservan la
 * clase: anularlo sobre la entidad (`orden.guestCustomer = null`) o marcarlo
 * con `@Exclude()` en la entidad, que además deja la regla escrita en un solo
 * sitio en vez de repetida en cada ruta.
 *
 * Esparcir dentro de un objeto literal (`{ ...result, data: ... }`) NO se
 * toca: eso construye un objeto nuevo a propósito y no le quita la clase a
 * nada.
 */
describe('los controladores no desarman entidades con resto', () => {
  const raizFuentes = join(__dirname, '..', '..');

  const controladores = (dir: string): string[] =>
    readdirSync(dir).flatMap((entrada) => {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) return controladores(ruta);
      return ruta.endsWith('.controller.ts') ? [ruta] : [];
    });

  /**
   * Devuelve una línea por cada `...resto` dentro de un patrón de desarmado de
   * objeto. Cubre las dos formas con las que apareció el fallo: la variable
   * (`const { password, ...result } = user`) y el parámetro
   * (`.map(({ password, ...user }) => user)`).
   */
  const desarmadosConResto = (ruta: string): string[] => {
    const fuente = ts.createSourceFile(
      ruta,
      readFileSync(ruta, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );

    const hallazgos: string[] = [];

    const visitar = (nodo: ts.Node): void => {
      if (
        ts.isObjectBindingPattern(nodo) &&
        nodo.elements.some((elemento) => elemento.dotDotDotToken !== undefined)
      ) {
        const { line } = fuente.getLineAndCharacterOfPosition(nodo.getStart());
        hallazgos.push(
          `${ruta.slice(raizFuentes.length + 1)}:${line + 1}  ${nodo
            .getText()
            .replace(/\s+/g, ' ')}`,
        );
      }
      ts.forEachChild(nodo, visitar);
    };

    visitar(fuente);
    return hallazgos;
  };

  it('encuentra controladores que revisar', () => {
    // Si el recorrido se rompe (cambio de rutas, de sufijo), la prueba de
    // abajo pasaría por vacía y dejaría de vigilar sin avisar.
    expect(controladores(raizFuentes).length).toBeGreaterThan(10);
  });

  it('detecta el desarmado con resto cuando lo hay', () => {
    // Sabotaje incorporado: si el detector dejara de funcionar, la prueba de
    // abajo pasaría siempre. Acá se le da el código exacto que causó el fallo
    // y se exige que lo señale.
    const fuente = ts.createSourceFile(
      'saboteado.controller.ts',
      `class C {
         async perfil() {
           const { password, ...result } = user;
           return result;
         }
         lista() {
           return datos.map(({ password, ...user }) => user);
         }
         seguro() {
           return { ...result, data: [] };
         }
       }`,
      ts.ScriptTarget.Latest,
      true,
    );

    const hallazgos: string[] = [];
    const visitar = (nodo: ts.Node): void => {
      if (
        ts.isObjectBindingPattern(nodo) &&
        nodo.elements.some((e) => e.dotDotDotToken !== undefined)
      ) {
        hallazgos.push(nodo.getText().replace(/\s+/g, ' '));
      }
      ts.forEachChild(nodo, visitar);
    };
    visitar(fuente);

    // Las dos formas del fallo, y NO el esparcido en literal, que es legítimo.
    expect(hallazgos).toEqual([
      '{ password, ...result }',
      '{ password, ...user }',
    ]);
  });

  it('ninguna ruta devuelve un objeto desarmado', () => {
    const hallazgos = controladores(raizFuentes).flatMap(desarmadosConResto);

    expect(hallazgos).toEqual([]);
  });
});

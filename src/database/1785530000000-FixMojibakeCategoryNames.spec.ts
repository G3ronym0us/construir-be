import { QueryRunner } from 'typeorm';
import { FixMojibakeCategoryNames1785530000000 } from './migrations/1785530000000-FixMojibakeCategoryNames';

/**
 * Esta migración arregla el nombre de seis categorías («SALAS DE BA¥OS») y
 * tiene que dejar el `slug` como está («salas-de-baos»), aunque al leerlo dé
 * la misma sensación de error.
 *
 * La tentación de «terminar el arreglo» y regenerar los slugs es fuerte, y es
 * justo lo que no se puede hacer: hay un `GET /categories/slug/:slug` y los
 * banners del panel guardan enlaces a `/categorias/<slug>`. Un slug corregido
 * convierte esos enlaces en 404 sin que nadie se entere.
 *
 * Estas pruebas fijan esa frontera sobre el SQL que la migración ejecuta: qué
 * columna toca, qué carácter cambia y qué queda fuera.
 */
describe('FixMojibakeCategoryNames — repone la Ñ sin tocar los slugs', () => {
  /** Recoge el SQL que la migración manda ejecutar. */
  const sqlDe = async (metodo: 'up' | 'down'): Promise<string[]> => {
    const ejecutadas: string[] = [];
    const queryRunner = {
      query: (sql: string) => {
        ejecutadas.push(sql);
        return Promise.resolve();
      },
    } as unknown as QueryRunner;

    await new FixMojibakeCategoryNames1785530000000()[metodo](queryRunner);
    return ejecutadas;
  };

  it('cambia ¥ por Ñ en categories.name', async () => {
    const [sql] = await sqlDe('up');

    expect(sql).toMatch(/UPDATE\s+categories/i);
    expect(sql).toMatch(/SET\s+name\s*=\s*REPLACE\(name,\s*'¥',\s*'Ñ'\)/i);
  });

  it('no menciona la columna slug en ningún sentido', async () => {
    const todas = [...(await sqlDe('up')), ...(await sqlDe('down'))];

    for (const sql of todas) {
      expect(sql).not.toMatch(/slug/i);
    }
  });

  it('sólo alcanza las filas que llevan el carácter roto', async () => {
    const [sql] = await sqlDe('up');

    // Sin este filtro el UPDATE reescribiría las ~100 categorías sanas, lo que
    // en una tabla con `updated_at` significa ensuciar la fecha de todas.
    expect(sql).toMatch(/WHERE\s+name\s+LIKE\s*'%¥%'/i);
  });

  it('el down sólo se acerca a las seis filas afectadas', async () => {
    const [sql] = await sqlDe('down');

    expect(sql).toMatch(/SET\s+name\s*=\s*REPLACE\(name,\s*'Ñ',\s*'¥'\)/i);
    expect(sql).toMatch(/id\s+IN\s*\(3,\s*47,\s*62,\s*80,\s*96,\s*97\)/i);
  });
});

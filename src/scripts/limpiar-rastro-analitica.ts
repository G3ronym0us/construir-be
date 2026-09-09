import { DataSource } from 'typeorm';
import { AppDataSource } from '../database/data-source';

/**
 * Borra del disco el rastro de las columnas eliminadas de `page_views`.
 *
 * **Este paso no es opcional y no lo hacen las migraciones.** En Postgres un
 * `DROP COLUMN` sólo marca el atributo como eliminado: los bytes de las filas ya
 * escritas siguen en el fichero de datos. Se puede comprobar leyéndolo con
 * `pg_read_binary_file` — y se comprobó: tras aplicar las dos migraciones de
 * esta rama, el token de invitación, las IPs y las cadenas `Mozilla` seguían los
 * tres legibles byte a byte, y por tanto en cualquier respaldo, snapshot o disco
 * dado de baja.
 *
 * Es decir: sin este paso la rama no consigue su objetivo. Existía sólo como un
 * comentario en el código y se omitió dos veces, así que ahora es un comando:
 *
 *     yarn analitica:limpiar-rastro
 *
 * `VACUUM FULL` reescribe la tabla entera y la bloquea mientras dura, así que
 * conviene una ventana de poco tráfico. Con los tamaños de esta tabla son
 * segundos. No puede ir dentro de una migración porque no corre en transacción.
 */

/** Cadenas que no deben quedar en el fichero de datos, y qué eran. */
const RASTROS: Array<{ patron: string; que: string }> = [
  { patron: 'Mozilla', que: 'navegadores (user_agent)' },
  { patron: 'token=', que: 'tokens de invitación en referrer' },
  { patron: '192.168.', que: 'IPs privadas de visitantes' },
  { patron: '::ffff:', que: 'IPs en forma IPv4 mapeada' },
];

async function rastrosPresentes(ds: DataSource): Promise<string[]> {
  // Sin CHECKPOINT se lee un fichero que aún no tiene las escrituras recientes
  // —siguen en los buffers compartidos— y todo parece limpio. El testigo de
  // más abajo existe justo para que ese falso negativo no pase inadvertido.
  await ds.query('CHECKPOINT');

  const [{ ruta }] = await ds.query(
    `SELECT pg_relation_filepath('page_views') AS ruta`,
  );

  const presentes: string[] = [];
  for (const { patron, que } of RASTROS) {
    const [{ hay }] = await ds.query(
      `SELECT position($1 in encode(pg_read_binary_file($2), 'escape')) > 0 AS hay`,
      [patron, ruta],
    );
    if (hay) presentes.push(`${que} ("${patron}")`);
  }
  return presentes;
}

/**
 * Comprueba que la lectura del fichero ve de verdad lo que hay.
 *
 * Un dato vivo —una ruta cualquiera de las que están guardadas— tiene que
 * aparecer. Si no aparece, la medición no vale y decir "está limpio" sería
 * mentir: pasó al escribir esta herramienta, y el resultado era un falso
 * "limpio" perfectamente convincente.
 */
async function laMedicionEsFiable(ds: DataSource): Promise<boolean> {
  const [{ ruta }] = await ds.query(
    `SELECT pg_relation_filepath('page_views') AS ruta`,
  );
  const [fila] = await ds.query(
    `SELECT path FROM page_views WHERE path IS NOT NULL AND length(path) > 4 LIMIT 1`,
  );
  if (!fila) return true; // Tabla vacía: no hay nada que medir.

  const [{ hay }] = await ds.query(
    `SELECT position($1 in encode(pg_read_binary_file($2), 'escape')) > 0 AS hay`,
    [fila.path, ruta],
  );
  return hay;
}

async function main() {
  const ds = await AppDataSource.initialize();

  try {
    const [{ count }] = await ds.query(`SELECT count(*)::int FROM page_views`);
    console.log(`page_views: ${count} filas\n`);

    await ds.query('CHECKPOINT');
    if (!(await laMedicionEsFiable(ds))) {
      console.error(
        '❌ La lectura del fichero de datos no ve ni los datos vivos, así que ' +
          'no puede decir nada sobre el rastro. Abortando en vez de dar un ' +
          'falso "limpio".',
      );
      process.exitCode = 1;
      return;
    }

    const antes = await rastrosPresentes(ds);
    if (antes.length === 0) {
      console.log('✅ No queda rastro en el fichero de datos. No hay nada que hacer.');
      return;
    }

    console.log('⚠️  Rastro legible en el fichero de datos, pese al DROP COLUMN:');
    antes.forEach((r) => console.log(`   - ${r}`));

    console.log('\n🧹 VACUUM FULL page_views (bloquea la tabla mientras dura)...');
    await ds.query('VACUUM FULL page_views');

    const despues = await rastrosPresentes(ds);
    const [{ count: countDespues }] = await ds.query(
      `SELECT count(*)::int FROM page_views`,
    );

    console.log(`\npage_views: ${countDespues} filas (antes ${count})`);

    if (despues.length > 0) {
      console.error('\n❌ Sigue habiendo rastro:');
      despues.forEach((r) => console.error(`   - ${r}`));
      // Salir con error: que un despliegue automatizado se entere.
      process.exitCode = 1;
      return;
    }

    console.log('✅ Rastro eliminado del fichero de datos.');
  } finally {
    await ds.destroy();
  }
}

main().catch((error) => {
  console.error('Error al limpiar el rastro de page_views:', error);
  process.exit(1);
});

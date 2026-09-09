import { DataSource } from 'typeorm';
import { AppDataSource } from '../database/data-source';

/**
 * Borra del disco el rastro de las columnas eliminadas de `page_views`.
 *
 * **Este paso no es opcional y no lo hacen las migraciones.** En Postgres un
 * `DROP COLUMN` sólo marca el atributo como eliminado: los bytes de las filas ya
 * escritas siguen en el fichero de datos y se leen sin esfuerzo con
 * `pg_read_binary_file`. Se comprobó: tras aplicar las dos migraciones de esta
 * rama, las IPs y las cadenas `Mozilla` seguían legibles.
 *
 * Sin este paso la rama no consigue su objetivo. Existía sólo como un comentario
 * en el código y se omitió dos veces, así que ahora es un comando:
 *
 *     yarn analitica:limpiar-rastro
 *
 * `VACUUM FULL` reescribe la tabla en un fichero nuevo y borra el viejo, así que
 * bloquea la tabla mientras dura: conviene una ventana de poco tráfico. Ojo con
 * lo que esto sí y no garantiza — desenlazar un fichero no sobrescribe los
 * bloques del dispositivo, así que protege frente a quien lea la base o un
 * respaldo lógico, no frente a quien haga forense sobre el disco. Para eso la
 * respuesta es el cifrado en reposo, no este comando.
 */

/** Trozos de 16 MB: `encode(…,'escape')` expande, y bytea tope a 1 GB. */
const TAMANO_TROZO = 16 * 1024 * 1024;

/**
 * Solape entre trozos consecutivos. Sin él, un patrón que caiga justo en la
 * frontera entre dos lecturas no lo ve ninguna de las dos.
 */
const SOLAPE = 256;

/** Cadenas que, si aparecen, sólo pueden venir de una columna ya eliminada. */
const RASTROS_LITERALES: Array<{ patron: string; que: string }> = [
  { patron: 'Mozilla', que: 'navegadores (user_agent)' },
  { patron: 'token=', que: 'tokens en la query de un referrer' },
  { patron: '::ffff:', que: 'IPs en forma IPv4 mapeada' },
];

/**
 * Cuarteto de puntos genérico.
 *
 * **Antes aquí había una lista de prefijos —`192.168.`, `::ffff:`— y eso era un
 * agujero serio**: una IPv4 pública no encaja en ninguno, así que sobre una
 * tabla con IPs de un ISP real (`190.202.x.y`) el comando respondía "no queda
 * rastro" y se saltaba el VACUUM entero. La ironía es que en producción, detrás
 * del proxy, `x-forwarded-for` guardaba justamente IPs públicas: la lista
 * parecía funcionar sólo porque los datos de desarrollo son loopback y privadas.
 *
 * Un cuarteto puede aparecer también en datos vivos (un referrer con host
 * numérico, una versión en un título), así que lo que se encuentre en el fichero
 * se contrasta contra lo que las filas vivas explican; sólo lo inexplicado
 * cuenta como rastro.
 */
const CUARTETO = '[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}';

interface Hallazgo {
  literales: Set<string>;
  ips: Set<string>;
  testigoVisto: boolean;
}

const esIpPlausible = (ip: string): boolean =>
  ip.split('.').every((o) => o.length <= 3 && Number(o) <= 255);

/** Todos los segmentos del fichero de la tabla: `X`, `X.1`, `X.2`… */
async function segmentos(ds: DataSource, base: string): Promise<Array<{ ruta: string; tam: number }>> {
  const encontrados: Array<{ ruta: string; tam: number }> = [];

  for (let i = 0; ; i++) {
    const ruta = i === 0 ? base : `${base}.${i}`;
    const [fila] = await ds.query(
      `SELECT (pg_stat_file($1, true)).size AS tam`,
      [ruta],
    );
    if (!fila || fila.tam === null) break;
    encontrados.push({ ruta, tam: Number(fila.tam) });
  }

  return encontrados;
}

/**
 * Recorre el fichero de la tabla buscando rastro.
 *
 * Va por segmentos y por trozos porque `pg_read_binary_file` no lee un fichero
 * entero por encima de 1 GB: sobre una `page_views` de 1221 MB el comando moría
 * con `file length too large`. Justo el tamaño al que llega esta tabla con 180
 * días de retención y tráfico real, que es el escenario que motiva la rama.
 */
async function buscarRastro(
  ds: DataSource,
  testigo: string | null,
): Promise<Hallazgo> {
  // Sin CHECKPOINT se lee un fichero que aún no tiene las escrituras recientes
  // —siguen en los buffers compartidos— y todo parece limpio. El testigo existe
  // para que ese falso negativo no pase inadvertido.
  await ds.query('CHECKPOINT');

  const [{ base }] = await ds.query(
    `SELECT pg_relation_filepath('page_views') AS base`,
  );

  const hallazgo: Hallazgo = {
    literales: new Set(),
    ips: new Set(),
    testigoVisto: testigo === null,
  };

  for (const { ruta, tam } of await segmentos(ds, base)) {
    for (let desde = 0; desde < tam; desde += TAMANO_TROZO - SOLAPE) {
      const largo = Math.min(TAMANO_TROZO, tam - desde);

      const [fila] = await ds.query(
        `
        WITH trozo AS (
          SELECT encode(pg_read_binary_file($1, $2, $3), 'escape') AS t
        )
        SELECT
          (SELECT array_agg(p) FROM unnest($4::text[]) p, trozo
           WHERE position(p in trozo.t) > 0) AS literales,
          (SELECT array_agg(DISTINCT m[1])
           FROM trozo, regexp_matches(trozo.t, $5, 'g') m) AS ips,
          (SELECT $6::text IS NULL OR position($6 in trozo.t) > 0 FROM trozo) AS testigo
        `,
        [
          ruta,
          desde,
          largo,
          RASTROS_LITERALES.map((r) => r.patron),
          CUARTETO,
          testigo,
        ],
      );

      (fila.literales ?? []).forEach((p: string) => hallazgo.literales.add(p));
      (fila.ips ?? [])
        .filter(esIpPlausible)
        .forEach((ip: string) => hallazgo.ips.add(ip));
      if (fila.testigo) hallazgo.testigoVisto = true;
    }
  }

  return hallazgo;
}

/** Cuartetos que las filas vivas explican por sí solas. */
async function ipsEnDatosVivos(ds: DataSource): Promise<Set<string>> {
  const filas: Array<{ ip: string }> = await ds.query(
    `
    SELECT DISTINCT m[1] AS ip
    FROM page_views pv,
         regexp_matches(
           coalesce(pv.path, '') || ' ' || coalesce(pv.title, '') || ' ' ||
           coalesce(pv.referrer, ''),
           $1, 'g') m
    `,
    [CUARTETO],
  );
  return new Set(filas.map((f) => f.ip));
}

/** Una cadena de un dato vivo, para comprobar que la lectura ve algo. */
async function testigoDeDatoVivo(ds: DataSource): Promise<string | null> {
  const [fila] = await ds.query(
    `SELECT path FROM page_views
     WHERE path IS NOT NULL AND length(path) BETWEEN 5 AND 60
     ORDER BY id DESC LIMIT 1`,
  );
  return fila?.path ?? null;
}

function describir(hallazgo: Hallazgo, vivas: Set<string>): string[] {
  const lineas: string[] = [];

  for (const { patron, que } of RASTROS_LITERALES) {
    if (hallazgo.literales.has(patron)) lineas.push(`${que} ("${patron}")`);
  }

  const huerfanas = [...hallazgo.ips].filter((ip) => !vivas.has(ip));
  if (huerfanas.length > 0) {
    const muestra = huerfanas.slice(0, 3).join(', ');
    lineas.push(
      `IPs de visitantes: ${huerfanas.length} distintas que ninguna fila viva ` +
        `explica (p. ej. ${muestra})`,
    );
  }

  return lineas;
}

async function main() {
  const ds = await AppDataSource.initialize();

  try {
    const [{ count }] = await ds.query(`SELECT count(*)::int FROM page_views`);
    console.log(`page_views: ${count} filas\n`);

    const testigo = await testigoDeDatoVivo(ds);
    const vivas = await ipsEnDatosVivos(ds);
    const antes = await buscarRastro(ds, testigo);

    // Si la lectura no ve ni los datos vivos, no puede decir nada sobre el
    // rastro. Abortar es la única respuesta honesta: un "limpio" aquí sería
    // exactamente la mentira que este comando existe para evitar.
    if (!antes.testigoVisto) {
      console.error(
        '❌ La lectura del fichero de datos no encuentra ni los datos vivos ' +
          `(se buscaba "${testigo}"), así que no puede afirmar nada sobre el ` +
          'rastro. Abortando en vez de dar un falso "limpio".',
      );
      process.exitCode = 1;
      return;
    }

    const pendiente = describir(antes, vivas);
    if (pendiente.length === 0) {
      console.log('✅ No queda rastro en el fichero de datos. No hay nada que hacer.');
      return;
    }

    console.log('⚠️  Rastro legible en el fichero de datos, pese al DROP COLUMN:');
    pendiente.forEach((r) => console.log(`   - ${r}`));

    console.log('\n🧹 VACUUM FULL page_views (bloquea la tabla mientras dura)...');
    await ds.query('VACUUM FULL page_views');

    const despues = await buscarRastro(ds, testigo);
    const [{ count: countDespues }] = await ds.query(
      `SELECT count(*)::int FROM page_views`,
    );
    console.log(`\npage_views: ${countDespues} filas (antes ${count})`);

    if (!despues.testigoVisto) {
      console.error('❌ Tras el VACUUM la lectura ya no ve los datos vivos; no se puede verificar.');
      process.exitCode = 1;
      return;
    }

    const restante = describir(despues, await ipsEnDatosVivos(ds));
    if (restante.length > 0) {
      console.error('\n❌ Sigue habiendo rastro:');
      restante.forEach((r) => console.error(`   - ${r}`));
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

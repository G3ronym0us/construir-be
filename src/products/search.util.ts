import { Brackets, WhereExpressionBuilder } from 'typeorm';

/**
 * Columnas del catálogo contra las que se busca. `custom_name` va con el nombre
 * real de la columna porque el QueryBuilder recibe SQL crudo, no la propiedad
 * de la entidad.
 */
const COLUMNAS_BUSCABLES = [
  'product.name',
  'product.custom_name',
  'product.sku',
  'product.barcode',
];

/**
 * Vocales y eñes acentuadas, y su equivalente plano. Se usa con `translate()`
 * de Postgres en lugar de la extensión `unaccent` porque instalar una extensión
 * exige superusuario y no lo tenemos garantizado en el servidor del cliente.
 * El catálogo son ~1100 productos, así que el escaneo secuencial que esto
 * implica se mide en decenas de milisegundos.
 */
const ACENTOS = 'áàäâãéèëêíìïîóòöôõúùüûñç';
const SIN_ACENTOS = 'aaaaaeeeeiiiiooooouuuunc';

/** Un término de más de 60 caracteres no es una búsqueda real, es ruido. */
const LARGO_MAXIMO_TERMINO = 60;

/** Más de 8 términos sólo multiplica el coste de la consulta sin aportar. */
const MAXIMO_TERMINOS = 8;

/** Envuelve una expresión SQL para compararla en minúsculas y sin acentos. */
function normalizar(expresion: string): string {
  return `translate(lower(${expresion}), '${ACENTOS}', '${SIN_ACENTOS}')`;
}

/**
 * Normaliza en JS lo que el usuario escribió, igual que `normalizar()` hace en
 * SQL: minúsculas, sin acentos. Así los dos lados de la comparación quedan en
 * el mismo alfabeto y da igual que el catálogo esté en MAYÚSCULAS sin acentos
 * y que la gente escriba en minúscula y con tildes.
 */
export function normalizarTermino(termino: string): string {
  return termino
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Escapa los comodines de LIKE para que se busquen como caracteres normales.
 *
 * Sin esto, `%` y `_` seguían siendo comodines dentro del patrón: buscar "%"
 * devolvía los 1089 productos del catálogo, "_" también, y "p_nt" daba 208
 * casando "pint", "pant" y "pnt". No era inyección — el término sí viaja
 * parametrizado — pero quien pegara un SKU o un código de barras con "_"
 * obtenía resultados de más sin entender por qué.
 *
 * La barra invertida va primero: si no, escaparía las que añaden las líneas
 * siguientes y volvería a dejar el comodín suelto.
 */
export function escaparComodinesLike(termino: string): string {
  return termino
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Parte lo que el usuario escribió en términos independientes.
 *
 * Devuelve `[]` cuando no hay nada buscable, para que quien llame sepa que no
 * debe añadir ninguna condición (y no filtre por una cadena vacía).
 */
export function separarTerminos(busqueda: string | undefined): string[] {
  if (!busqueda) return [];

  return busqueda
    .split(/\s+/)
    .map((termino) => normalizarTermino(termino.trim()))
    .filter((termino) => termino.length > 0)
    .map((termino) => termino.slice(0, LARGO_MAXIMO_TERMINO))
    .slice(0, MAXIMO_TERMINOS);
}

/**
 * Aplica la búsqueda del catálogo al `WHERE` del QueryBuilder recibido.
 *
 * Regresión que arregla: antes se pasaba TODO lo escrito como una sola cadena a
 * un `ILIKE '%...%'`, o sea que se exigía la frase literal y en ese orden.
 * Buscar "pint azul" devolvía CERO productos aunque el catálogo tenga 24 que
 * son justamente pinturas azules, porque se llaman "PINT PLAST AZUL 1G
 * SOLINTEX 185": las dos palabras están, pero nunca pegadas.
 *
 * Ahora cada término se exige por separado (AND entre términos) y puede
 * aparecer en cualquiera de las columnas buscables (OR entre columnas), en
 * cualquier orden y en cualquier parte del texto. Los términos se comparan
 * normalizados a minúsculas y sin acentos por los dos lados.
 *
 * El prefijo `alias` evita que dos llamadas en la misma consulta pisen los
 * parámetros la una de la otra.
 */
export function aplicarBusquedaDeProductos(
  builder: WhereExpressionBuilder,
  busqueda: string | undefined,
  alias = 'busqueda',
): void {
  const terminos = separarTerminos(busqueda);
  if (terminos.length === 0) return;

  terminos.forEach((termino, indice) => {
    const parametro = `${alias}${indice}`;

    builder.andWhere(
      new Brackets((qb) => {
        COLUMNAS_BUSCABLES.forEach((columna) => {
          // `ESCAPE '\'` es explícito: es el valor por defecto en Postgres,
          // pero dejarlo escrito evita que un cambio de motor o de
          // `standard_conforming_strings` reviva el bug en silencio.
          qb.orWhere(
            `${normalizar(columna)} LIKE :${parametro} ESCAPE '\\'`,
          );
        });
      }),
      { [parametro]: `%${escaparComodinesLike(termino)}%` },
    );
  });
}

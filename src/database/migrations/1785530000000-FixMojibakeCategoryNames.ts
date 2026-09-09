import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repone la `Ñ` en los seis nombres de categoría que la tienen escrita como `¥`.
 *
 * El cliente ve «SALAS DE BA¥OS» y «MAT DA¥ADO DE SEGUNDA» en el menú y en las
 * migas de pan. No es un fallo de la fuente ni del navegador: en la base está
 * guardado el carácter U+00A5 (signo del yen) donde debería ir la eñe. Viene
 * del CSV de exportación de la tienda vieja de WooCommerce, que ya trae los
 * bytes `C2 A5` en «SALAS DE BA¥OS»; los scripts de `src/scripts/` lo copiaron
 * tal cual, sin normalizar nada.
 *
 * Filas afectadas (las únicas de toda la base):
 *   3  SALAS DE BA¥OS                 →  SALAS DE BAÑOS
 *   47 REPUESTOS PARA BA¥O            →  REPUESTOS PARA BAÑO
 *   62 MAT DA¥ADO DE SEGUNDA          →  MAT DAÑADO DE SEGUNDA
 *   80 HERRAJES P/BA¥O-TANQUES-REP    →  HERRAJES P/BAÑO-TANQUES-REP
 *   96 PALUSTRAS Y CEPILLO ALBA¥ILER  →  PALUSTRAS Y CEPILLO ALBAÑILER
 *   97 CINCELES-PIQUETAS ALBA¥IL      →  CINCELES-PIQUETAS ALBAÑIL
 *
 * **Los `slug` se dejan intactos a propósito**, aunque también perdieron la eñe
 * (`salas-de-baos`, `mat-daado-de-segunda`). El slug no es decorativo: hay un
 * `GET /categories/slug/:slug` en el backend y los banners del panel pueden
 * apuntar a `/categorias/<slug>` (`BannerLinkInput` del frontend). Cambiarlos
 * rompería en silencio cualquier enlace ya publicado, y el visitante no ve el
 * slug en ningún sitio. Un slug feo no es un fallo; un enlace roto sí.
 *
 * El reemplazo va por patrón y no por lista de ids porque el `¥` no tiene
 * ningún uso legítimo en un catálogo de ferretería, y así una fila nueva con el
 * mismo defecto también queda corregida si esta migración aún no había corrido.
 *
 * OJO al probar en local: `app.module.ts` levanta con `migrationsRun: true`, así
 * que esto se aplica solo al arrancar el backend contra la base de desarrollo,
 * que es compartida.
 */
export class FixMojibakeCategoryNames1785530000000
  implements MigrationInterface
{
  name = 'FixMojibakeCategoryNames1785530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE categories
      SET name = REPLACE(name, '¥', 'Ñ')
      WHERE name LIKE '%¥%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Se vuelve a romper sólo lo que esta migración arregló. Ninguna otra
    // categoría lleva `Ñ` en su nombre, pero acotar por id evita estropear una
    // categoría creada a mano después de aplicar el `up`.
    await queryRunner.query(`
      UPDATE categories
      SET name = REPLACE(name, 'Ñ', '¥')
      WHERE id IN (3, 47, 62, 80, 96, 97)
        AND name LIKE '%Ñ%'
    `);
  }
}

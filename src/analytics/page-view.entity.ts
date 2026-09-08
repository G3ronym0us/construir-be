import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Registro de una visita a una página de la tienda.
 *
 * **Aquí no se guarda ni la IP ni el navegador del visitante, y no es un
 * olvido.** La IP se guardaba una por fila, indefinidamente, y ninguna consulta
 * la leía nunca: las únicas dos
 * lecturas de esta tabla cuentan filas por fecha y agrupan por `path`. Era un
 * dato personal retenido a perpetuidad sin uso, es decir sólo riesgo. El dato
 * que no se recoge no se filtra ni hay que protegerlo, así que se dejó de
 * recoger en lugar de ofuscarlo. Si algún día hacen falta visitantes únicos,
 * la vía es un identificador derivado (hash con sal que rote a diario), no
 * volver a guardar la IP en claro.
 *
 * El `user_agent` se fue por lo mismo y con un agravante: tampoco lo leía nadie,
 * y es media huella de navegador — cruzado con `path` y `created_at` reidentifica
 * sesiones aunque la IP ya no esté.
 *
 * El `referrer` se guarda recortado a su origen. Guardarlo entero metía aquí los
 * términos de búsqueda del visitante y, de hecho, llegó a guardar el `?token=`
 * de una invitación de registro.
 */
@Entity('page_views')
export class PageView {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  path: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  title: string;

  /**
   * Sólo el origen (`https://google.com`), nunca la ruta. Ver `aOrigenDeReferrer`.
   *
   * El tipo dice `| null` porque la columna es nullable de verdad: la navegación
   * directa y cualquier referrer que no sea una URL http(s) utilizable se
   * guardan como null.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer: string | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}

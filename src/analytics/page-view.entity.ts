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
 * **Aquí no se guarda la IP del visitante, y no es un olvido.** Se guardaba una
 * por fila, indefinidamente, y ninguna consulta la leía nunca: las únicas dos
 * lecturas de esta tabla cuentan filas por fecha y agrupan por `path`. Era un
 * dato personal retenido a perpetuidad sin uso, es decir sólo riesgo. El dato
 * que no se recoge no se filtra ni hay que protegerlo, así que se dejó de
 * recoger en lugar de ofuscarlo. Si algún día hacen falta visitantes únicos,
 * la vía es un identificador derivado (hash con sal que rote a diario), no
 * volver a guardar la IP en claro.
 */
@Entity('page_views')
export class PageView {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  path: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}

import { Exclude } from 'class-transformer';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Generated,
} from 'typeorm';

export enum ApiKeyPermission {
  READ = 'read',
  WRITE = 'write',
  READ_WRITE = 'read_write',
}

@Entity('api_keys')
export class ApiKey {
  @Exclude()
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Generated('uuid')
  uuid: string;

  @Column({ type: 'varchar', length: 100, unique: true, name: 'consumer_key' })
  @Index()
  consumerKey: string;

  // El hash del secreto nunca debe salir serializado. `ApiKeysService` ya lo
  // enmascara a mano en los tres métodos que devuelven la entidad, pero ese
  // enmascarado no cubre las rutas que la exponen por relación: hasta acá,
  // `GET /admin/api-logs/:uuid` cargaba `relations: ['apiKey']` y devolvía el
  // hash en claro. `@Exclude()` lo cierra en todas las rutas de una vez.
  //
  // No afecta la creación: el secreto en texto plano viaja como campo aparte
  // en la raíz de la respuesta, no dentro de la entidad. Ni la validación:
  // `validateCredentials()` lee la propiedad, y `@Exclude()` sólo actúa sobre
  // la serialización.
  @Exclude()
  @Column({ type: 'varchar', length: 100, name: 'consumer_secret' })
  consumerSecret: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({
    type: 'enum',
    enum: ApiKeyPermission,
    default: ApiKeyPermission.READ,
  })
  permissions: ApiKeyPermission;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_used_at' })
  lastUsedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

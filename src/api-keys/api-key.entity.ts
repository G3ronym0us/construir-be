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
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Generated('uuid')
  uuid: string;

  @Column({ type: 'varchar', length: 100, unique: true, name: 'consumer_key' })
  @Index()
  consumerKey: string;

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

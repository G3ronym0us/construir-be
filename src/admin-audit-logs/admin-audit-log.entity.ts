import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  BULK = 'bulk',
}

@Entity('admin_audit_logs')
@Index('idx_audit_logs_user_id', ['userId'])
@Index('idx_audit_logs_resource', ['resource'])
@Index('idx_audit_logs_created_at', ['createdAt'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @Column({ name: 'user_email' })
  userEmail: string;

  @Column({ name: 'user_full_name' })
  userFullName: string;

  @Column({ type: 'varchar' })
  action: AuditAction;

  @Column({ type: 'varchar' })
  resource: string;

  @Column({ name: 'resource_id', type: 'varchar', nullable: true })
  resourceId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any> | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

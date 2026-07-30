import { Exclude } from 'class-transformer';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { UserRole } from './user.entity';

@Entity('user_invitations')
@Index('idx_user_invitations_email', ['email'])
@Index('idx_user_invitations_expires_at', ['expiresAt'])
export class UserInvitation {
  @Exclude()
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  uuid: string;

  @Column()
  email: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'users_role_enum',
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'first_name', type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', type: 'varchar', nullable: true })
  lastName: string | null;

  // Mismo patrón que `User.password`: quien tenga este token puede completar
  // el registro en nombre del invitado, con el rol que se le haya asignado
  // (potencialmente ADMIN) -- es una credencial de un solo uso, no un dato
  // de exhibición. `GET /users/admin/invitations` (listado paginado, para el
  // panel) devolvía las entidades crudas y lo exponía a cualquiera con acceso
  // a esa vista sin necesidad de haber recibido el email de invitación.
  @Exclude()
  @Column({ unique: true, length: 128 })
  token: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @Exclude()
  @Column({ name: 'invited_by_user_id', type: 'int', nullable: true })
  invitedByUserId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'invited_by_user_id',
    foreignKeyConstraintName: 'user_invitations_invited_by_user_id_fkey',
  })
  invitedBy: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

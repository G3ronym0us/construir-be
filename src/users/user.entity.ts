import { Exclude } from 'class-transformer';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Generated,
} from 'typeorm';
import { IdentificationType } from '../orders/guest-customer.entity';

export enum UserRole {
  ADMIN = 'admin',
  ORDER_ADMIN = 'order_admin',
  CUSTOMER = 'customer',
  USER = 'user',
}

@Entity('users')
export class User {
  @Exclude()
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Generated('uuid')
  uuid: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'identification_type', type: 'enum', enum: IdentificationType, nullable: true })
  identificationType: IdentificationType | null;

  @Column({ name: 'identification_number', type: 'varchar', length: 50, nullable: true })
  identificationNumber: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ name: 'email_verification_token', type: 'varchar', length: 128, nullable: true, unique: true })
  emailVerificationToken: string | null;

  @Column({ name: 'email_verification_expires_at', type: 'timestamptz', nullable: true })
  emailVerificationExpiresAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

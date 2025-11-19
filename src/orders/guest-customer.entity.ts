import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum IdentificationType {
  V = 'V', // Venezolano
  E = 'E', // Extranjero
  J = 'J', // Jurídico
  G = 'G', // Gobierno
  P = 'P', // Pasaporte
}

@Entity('guest_customers')
@Index(['identificationType', 'identificationNumber'], { unique: true })
export class GuestCustomer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: IdentificationType,
    name: 'identification_type',
  })
  identificationType: IdentificationType;

  @Column({ name: 'identification_number', length: 50 })
  identificationNumber: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 20 })
  phone: string;

  // Última dirección conocida
  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 100, nullable: true })
  state?: string;

  @Column({ name: 'zip_code', length: 20, nullable: true })
  zipCode?: string;

  @Column({ length: 100, nullable: true })
  country?: string;

  @Column({ type: 'text', nullable: true, name: 'additional_info' })
  additionalInfo?: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  // Contador de órdenes realizadas
  @Column({ name: 'orders_count', default: 0 })
  ordersCount: number;

  // Última compra
  @Column({ name: 'last_order_date', type: 'timestamp', nullable: true })
  lastOrderDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

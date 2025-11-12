import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { OrderItem } from './order-item.entity';
import { ShippingAddress } from './shipping-address.entity';
import { PaymentInfo } from './payment-info.entity';
import { Discount } from '../discounts/discount.entity';

export enum OrderStatus {
  PENDING = 'pending', // Orden creada, esperando confirmación de pago
  PAYMENT_REVIEW = 'payment_review', // Pago en revisión
  CONFIRMED = 'confirmed', // Pago confirmado
  PROCESSING = 'processing', // Orden siendo procesada
  SHIPPED = 'shipped', // Orden enviada
  DELIVERED = 'delivered', // Orden entregada
  CANCELLED = 'cancelled', // Orden cancelada
  REFUNDED = 'refunded', // Orden reembolsada
}

export enum DeliveryMethod {
  PICKUP = 'pickup', // Retiro en tienda
  DELIVERY = 'delivery', // Envío a domicilio
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true, default: () => 'uuid_generate_v4()' })
  uuid: string;

  @Column({ name: 'order_number', unique: true })
  orderNumber: string;

  @Column({ name: 'user_id', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'guest_email', type: 'varchar', nullable: true })
  guestEmail: string | null;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @OneToOne(() => ShippingAddress, { cascade: true, eager: true, nullable: true })
  @JoinColumn({ name: 'shipping_address_id' })
  shippingAddress: ShippingAddress | null;

  @Column({ name: 'shipping_address_id', nullable: true })
  shippingAddressId: number | null;

  @OneToOne(() => PaymentInfo, { cascade: true, eager: true })
  @JoinColumn({ name: 'payment_info_id' })
  paymentInfo: PaymentInfo;

  @Column({ name: 'payment_info_id' })
  paymentInfoId: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: DeliveryMethod,
    name: 'delivery_method',
    default: DeliveryMethod.DELIVERY,
  })
  deliveryMethod: DeliveryMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shipping: number;

  @Column({ name: 'discount_id', nullable: true })
  discountId: number | null;

  @ManyToOne(() => Discount, { eager: true, nullable: true })
  @JoinColumn({ name: 'discount_id' })
  discount: Discount | null;

  @Column({ name: 'discount_code', type: 'varchar', nullable: true })
  discountCode: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'discount_amount' })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed properties
  get totalItems(): number {
    return this.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }
}

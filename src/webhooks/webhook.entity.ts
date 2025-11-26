import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WebhookEvent {
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_DELETED = 'product.deleted',
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_STATUS_CHANGED = 'order.status_changed',
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
}

@Entity('webhooks')
export class Webhook {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
  @Index()
  url: string;

  @Column({ type: 'simple-array' })
  events: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  secret: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'int', default: 0, name: 'delivery_count' })
  deliveryCount: number;

  @Column({ type: 'int', default: 0, name: 'failure_count' })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true, name: 'last_delivery_at' })
  lastDeliveryAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

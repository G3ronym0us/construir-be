import { Exclude } from 'class-transformer';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Generated,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../products/product.entity';

@Entity('order_items')
export class OrderItem {
  @Exclude()
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true })
  @Generated('uuid')
  uuid: string;

  @Column({ name: 'order_id' })
  orderId: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ name: 'product_sku' })
  productSku: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  /**
   * Desglose de la línea, congelado al crear el pedido.
   *
   * `subtotal` es inclusivo de IVA; estos dos lo abren: `base + iva === subtotal`.
   * Se persisten porque el contrato del ERP pide el monto SIN impuesto, y
   * derivarlo al leer obligaba a mirar `product.ivaType` — el estado vivo del
   * producto — de modo que cambiarle la alícuota a un producto le reescribía el
   * impuesto a órdenes ya facturadas.
   *
   * Nulos en las órdenes anteriores a la migración: no se rellenaron porque
   * recalcularlas con la alícuota de hoy es justo el error que esto corrige.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  base: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  iva: number | null;

  @Column({
    name: 'price_ves',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  priceVes: number | null;

  @Column({
    name: 'subtotal_ves',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  subtotalVes: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

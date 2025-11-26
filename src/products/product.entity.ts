import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Generated,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { ProductImage } from './product-image.entity';
import { Category } from '../categories/category.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Generated('uuid')
  uuid: string;

  @Column()
  name: string;

  @Column({ unique: true })
  sku: string;

  @Column({ type: 'int', default: 0 })
  inventory: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({
    name: 'price_ves',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  priceVes: number;

  @ManyToMany(() => Category, (category) => category.products, { eager: true })
  @JoinTable({
    name: 'product_categories',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  shortDescription: string | null;

  @Column({ type: 'varchar', length: 20, default: 'simple' })
  type: string;

  @Column({ type: 'boolean', default: true })
  published: boolean;

  @Column({ type: 'boolean', default: false })
  featured: boolean;

  @Column({ type: 'varchar', length: 50, default: 'visible' })
  visibility: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @OneToMany(() => ProductImage, (image) => image.product, {
    cascade: true,
    eager: true,
  })
  images: ProductImage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}

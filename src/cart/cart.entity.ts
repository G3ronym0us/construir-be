import { Exclude, Expose } from 'class-transformer';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  Generated,
} from 'typeorm';
import { User } from '../users/user.entity';
import { CartItem } from './cart-item.entity';

@Entity('carts')
export class Cart {
  @Exclude()
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', unique: true })
  @Generated('uuid')
  uuid: string;

  @Column({ name: 'user_id' })
  userId: number;

  // Sin `eager`: nada en el código consume `cart.user` (los controladores
  // usan `req.user` del JWT, no esta relación) y cargarlo entero en cada
  // lectura del carrito lo exponía completo -- hash de contraseña incluido
  // -- en la respuesta de `GET /cart`, que serializa la entidad `Cart` cruda.
  // Es defensa en profundidad además del `@Exclude()` en `User.password`:
  // si algún día alguien SÍ necesita `cart.user`, tiene que pedirlo
  // explícitamente con `relations`, y ahí lo vuelve a filtrar el
  // `ClassSerializerInterceptor`.
  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => CartItem, (cartItem) => cartItem.cart, {
    cascade: true,
    eager: true,
  })
  items: CartItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed properties
  @Expose()
  get totalItems(): number {
    return this.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }

  @Expose()
  get subtotal(): number {
    return this.items?.reduce((sum, item) => sum + item.subtotal, 0) || 0;
  }

  @Expose()
  get subtotalVes(): number | null {
    if (!this.items || this.items.length === 0) {
      return null;
    }

    const total = this.items.reduce((sum, item) => {
      const itemSubtotalVes = item.subtotalVes;
      return sum + (itemSubtotalVes || 0);
    }, 0);

    return total > 0 ? total : null;
  }
}

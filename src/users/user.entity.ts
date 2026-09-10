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

  // `@Exclude()` sólo afecta la SERIALIZACIÓN (lo que arma
  // `ClassTransformer`/`ClassSerializerInterceptor` para la respuesta HTTP),
  // nunca la carga de la entidad: `AuthService` sigue pudiendo leer
  // `user.password` para compararla con bcrypt sin ningún cambio. Antes de
  // este fix, el hash bcrypt salía crudo en cualquier respuesta que
  // serializara un `User` completo -- por ejemplo `GET /cart`, que carga el
  // usuario dueño del carrito vía relación `eager`.
  @Exclude()
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

  @Column({
    name: 'identification_type',
    type: 'enum',
    enum: IdentificationType,
    nullable: true,
  })
  identificationType: IdentificationType | null;

  @Column({
    name: 'identification_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  identificationNumber: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified: boolean;

  // Token de un solo uso: quien lo tenga puede verificar el correo de la
  // cuenta en su nombre. Es una credencial igual que `password`.
  @Exclude()
  @Column({
    name: 'email_verification_token',
    type: 'varchar',
    length: 128,
    nullable: true,
    unique: true,
  })
  emailVerificationToken: string | null;

  // No habilita nada por sí sola, pero delata que hay una verificación en
  // curso: la fecha aparece justo mientras el token está vivo y desaparece
  // cuando se consume. Quien pregunte por un usuario cada tanto sabe cuándo
  // acaba de salir un enlace y en qué ventana atacarlo. La pantalla que
  // legítimamente necesita el plazo se lo pide a `getResetTokenInfo`, que ya
  // exige tener el token en la mano.
  @Exclude()
  @Column({
    name: 'email_verification_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  emailVerificationExpiresAt: Date | null;

  // Token de un solo uso: quien lo tenga puede tomar la cuenta reseteando la
  // contraseña sin conocer la actual. Es una credencial igual que `password`.
  @Exclude()
  @Column({
    name: 'password_reset_token',
    type: 'varchar',
    length: 96,
    nullable: true,
    unique: true,
  })
  passwordResetToken: string | null;

  // No habilita nada por sí sola --sin el token no sirve para tomar la
  // cuenta-- pero delata que hay una recuperación en curso: por el mismo
  // motivo que su gemela de arriba, se excluye. Quien de verdad necesita el
  // plazo es la pantalla de nueva contraseña, y esa lo obtiene de
  // `getResetTokenInfo`, que sólo responde a quien ya trae el token.
  @Exclude()
  @Column({
    name: 'password_reset_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  passwordResetExpiresAt: Date | null;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

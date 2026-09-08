import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Exclude, Expose } from 'class-transformer';
import { Bank } from '../banks/bank.entity';

export enum PaymentMethod {
  ZELLE = 'zelle',
  PAGOMOVIL = 'pagomovil',
  TRANSFERENCIA = 'transferencia',
}

export enum PaymentStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

@Entity('payment_info')
export class PaymentInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  method: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  // Campos para Zelle
  @Column({ name: 'sender_name', nullable: true })
  senderName: string;

  @Column({ name: 'sender_bank', nullable: true })
  senderBank: string;

  // Campos para PagoMóvil
  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  cedula: string;

  @ManyToOne(() => Bank, { nullable: true, eager: true })
  @JoinColumn({ name: 'bank_id' })
  bank: Bank;

  @Column({ name: 'bank_id', nullable: true })
  bankId: number;

  @Column({ name: 'reference_code', nullable: true })
  referenceCode: string;

  // Campos para Transferencia
  @Column({ name: 'account_name', nullable: true })
  accountName: string;

  @ManyToOne(() => Bank, { nullable: true, eager: true })
  @JoinColumn({ name: 'transfer_bank_id' })
  transferBank: Bank;

  @Column({ name: 'transfer_bank_id', nullable: true })
  transferBankId: number;

  @Column({ name: 'reference_number', nullable: true })
  referenceNumber: string;

  /**
   * Comprobante de pago.
   *
   * Los dos campos van con `@Exclude()`: el comprobante lleva el nombre, la
   * cédula, el banco y el número de cuenta del cliente, y salía en cualquier
   * respuesta que devolviera la orden — incluida la del propio invitado al
   * terminar el checkout — como una URL pública y permanente del bucket. Ahora
   * la orden sólo dice si hay comprobante (`hasReceipt`); para verlo hay que
   * pedir un enlace firmado a `GET /orders/:uuid/receipt`, que autoriza.
   *
   * `receiptUrl` queda para leer los comprobantes viejos que todavía la tienen
   * guardada; en las subidas nuevas no se escribe nunca.
   */
  @Exclude()
  @Column({ name: 'receipt_url', nullable: true })
  receiptUrl: string | null;

  @Exclude()
  @Column({ name: 'receipt_key', nullable: true })
  receiptKey: string | null;

  /** Lo único que la orden cuenta del comprobante sin autorizar a nadie. */
  @Expose()
  get hasReceipt(): boolean {
    return Boolean(this.receiptKey || this.receiptUrl);
  }

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

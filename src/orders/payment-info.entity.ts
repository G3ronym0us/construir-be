import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
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

  // Comprobante de pago
  @Column({ name: 'receipt_url', nullable: true })
  receiptUrl: string;

  @Column({ name: 'receipt_key', nullable: true })
  receiptKey: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

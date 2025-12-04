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

export interface BannerImageVariants {
  desktop: {
    webp: string;
    jpeg: string;
  };
  tablet: {
    webp: string;
    jpeg: string;
  };
  mobile: {
    webp: string;
    jpeg: string;
  };
}

@Entity('banners')
export class Banner {
  @Exclude()
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Generated('uuid')
  uuid: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ default: 0 })
  priority: number;

  @Column({ type: 'timestamp', name: 'start_date', nullable: true })
  startDate?: Date;

  @Column({ type: 'timestamp', name: 'end_date', nullable: true })
  endDate?: Date;

  @Column({ nullable: true })
  link: string;

  @Column({ type: 'jsonb' })
  images: BannerImageVariants;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}

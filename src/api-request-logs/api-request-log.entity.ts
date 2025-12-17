import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Generated,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiKey } from '../api-keys/api-key.entity';

@Entity('api_request_logs')
export class ApiRequestLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Generated('uuid')
  uuid: string;

  // Request Info
  @Column({ name: 'method', length: 10 })
  method: string;

  @Index()
  @Column({ name: 'path', type: 'text' })
  path: string;

  @Column({ name: 'query', type: 'jsonb', nullable: true })
  query: Record<string, any>;

  @Column({ name: 'request_body', type: 'jsonb', nullable: true })
  requestBody: Record<string, any>;

  @Column({ name: 'request_headers', type: 'jsonb', nullable: true })
  requestHeaders: Record<string, any>;

  // Response Info
  @Index()
  @Column({ name: 'status_code', type: 'int' })
  statusCode: number;

  @Column({ name: 'response_body', type: 'jsonb', nullable: true })
  responseBody: Record<string, any>;

  @Column({ name: 'response_time', type: 'int' })
  responseTime: number;

  // API Key Info
  @Index()
  @Column({ name: 'consumer_key', length: 255, nullable: true })
  consumerKey: string;

  @ManyToOne(() => ApiKey, { nullable: true })
  @JoinColumn({ name: 'api_key_id' })
  apiKey: ApiKey;

  // Error Info
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'error_stack', type: 'text', nullable: true })
  errorStack: string;

  // IP Info
  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string;

  // Timestamps
  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Index()
  @Column({ name: 'is_error', type: 'boolean', default: false })
  isError: boolean;
}

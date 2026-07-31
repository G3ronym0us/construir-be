import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailPayloadBuilder } from './payload.builder';

@Module({
  providers: [EmailService, EmailPayloadBuilder],
  exports: [EmailService],
})
export class EmailModule {}

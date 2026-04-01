import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { InvitationsService } from './invitations.service';
import { User } from './user.entity';
import { UserInvitation } from './user-invitation.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserInvitation]), EmailModule],
  controllers: [UsersController],
  providers: [UsersService, InvitationsService],
  exports: [UsersService],
})
export class UsersModule {}

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../users/user.entity';

@Injectable()
export class OrderAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    return user.role === UserRole.ADMIN || user.role === UserRole.ORDER_ADMIN;
  }
}

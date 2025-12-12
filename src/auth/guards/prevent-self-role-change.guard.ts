import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Guard to prevent administrators from modifying their own role or deleting themselves.
 * This prevents accidental privilege escalation or self-lockout scenarios.
 */
@Injectable()
export class PreventSelfRoleChangeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const currentUserUuid = request.user?.uuid;
    const targetUserUuid = request.params?.uuid;

    if (!currentUserUuid || !targetUserUuid) {
      return true; // Let other guards handle authentication/validation
    }

    if (currentUserUuid === targetUserUuid) {
      throw new ForbiddenException(
        'You cannot modify your own role or delete yourself',
      );
    }

    return true;
  }
}

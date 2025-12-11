import { ExecutionContext } from '@nestjs/common';
import { OrderAdminGuard } from './order-admin.guard';
import { UserRole } from '../../users/user.entity';

describe('OrderAdminGuard', () => {
  let guard: OrderAdminGuard;

  beforeEach(() => {
    guard = new OrderAdminGuard();
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow access for ADMIN role', () => {
      const context = createMockExecutionContext({ role: UserRole.ADMIN });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access for ORDER_ADMIN role', () => {
      const context = createMockExecutionContext({ role: UserRole.ORDER_ADMIN });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access for USER role', () => {
      const context = createMockExecutionContext({ role: UserRole.USER });
      expect(guard.canActivate(context)).toBe(false);
    });

    it('should deny access when no user in request', () => {
      const context = createMockExecutionContext(null);
      expect(guard.canActivate(context)).toBe(false);
    });

    it('should deny access when user exists but has no role', () => {
      const context = createMockExecutionContext({ id: 1, email: 'test@test.com' });
      expect(guard.canActivate(context)).toBe(false);
    });

    it('should deny access when user is undefined', () => {
      const context = createMockExecutionContext(undefined);
      expect(guard.canActivate(context)).toBe(false);
    });
  });
});

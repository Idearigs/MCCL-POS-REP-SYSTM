import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

function makeContext(
  role: string | undefined,
  handlerRoles: string[] | undefined,
): ExecutionContext {
  const mockReflector = {
    getAllAndOverride: jest.fn().mockReturnValue(handlerRoles),
  } as any;
  const mockRequest = { user: role !== undefined ? { role } : undefined };

  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => mockRequest }),
  } as any;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new RolesGuard(reflector);
  });

  it('allows request when no @Roles() decorator is present', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = makeContext('STAFF', undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows OWNER to access OWNER-only endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER']);
    const ctx = makeContext('OWNER', ['OWNER']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows MANAGER to access OWNER+MANAGER endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER', 'MANAGER']);
    const ctx = makeContext('MANAGER', ['OWNER', 'MANAGER']);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies STAFF from OWNER-only endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER']);
    const ctx = makeContext('STAFF', ['OWNER']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('denies MANAGER from OWNER-only endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER']);
    const ctx = makeContext('MANAGER', ['OWNER']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('denies READONLY from OWNER+MANAGER endpoint', () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER', 'MANAGER']);
    const ctx = makeContext('READONLY', ['OWNER', 'MANAGER']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('denies request when user has no role property', () => {
    reflector.getAllAndOverride.mockReturnValue(['OWNER']);
    const ctx = makeContext(undefined, ['OWNER']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});

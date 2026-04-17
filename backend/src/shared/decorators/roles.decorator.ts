import { SetMetadata } from '@nestjs/common';

export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF' | 'READONLY';

export const ROLES_KEY = 'roles';

/**
 * Restrict an endpoint to users whose role is in the provided list.
 * Must be used alongside RolesGuard (applied after JwtAuthGuard so
 * req.user is already populated).
 *
 * @example
 *   @Roles('OWNER')
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Delete('users/:id')
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

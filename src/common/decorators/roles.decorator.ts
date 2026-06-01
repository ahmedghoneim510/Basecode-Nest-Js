import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restrict access to specific roles.
 *
 * Usage:
 *   @Roles('ADMIN')
 *   @Get('admin-only')
 *   adminEndpoint() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

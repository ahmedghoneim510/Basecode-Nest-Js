import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract the current authenticated user from the request.
 *
 * Usage:
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: UserPayload) { ... }
 *
 *   @Get('profile')
 *   getProfile(@CurrentUser('id') userId: number) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);

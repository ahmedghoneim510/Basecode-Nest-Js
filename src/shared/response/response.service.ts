import { HttpStatus, Injectable } from '@nestjs/common';
import { TranslationService } from '../i18n/translation.service';
import { ApiResponse, PaginationMeta, PaginationOptions } from './response.interface';

@Injectable()
export class ResponseService {
  constructor(private trans: TranslationService) {}

  /**
   * Success response with data.
   *
   * Usage:
   *   return this.response.success(user);
   *   return this.response.success(tokens, 'auth.login_success');
   */
  success<T>(data: T, messageKey?: string, args?: Record<string, any>): ApiResponse<T> {
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: messageKey
        ? this.trans.t(messageKey, { args })
        : this.trans.t('common.success'),
      data,
    };
  }

  /**
   * Created response (201).
   *
   * Usage:
   *   return this.response.created(newUser, 'user.created');
   */
  created<T>(data: T, messageKey?: string, args?: Record<string, any>): ApiResponse<T> {
    return {
      success: true,
      statusCode: HttpStatus.CREATED,
      message: messageKey
        ? this.trans.t(messageKey, { args })
        : this.trans.t('common.created'),
      data,
    };
  }

  /**
   * Success response with message only (no data).
   *
   * Usage:
   *   return this.response.message('auth.logged_out');
   */
  message(messageKey: string, args?: Record<string, any>): ApiResponse<null> {
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: this.trans.t(messageKey, { args }),
      data: null,
    };
  }

  /**
   * Paginated response.
   *
   * Usage:
   *   return this.response.paginate(users, total, { page: 1, perPage: 10 });
   */
  paginate<T>(
    data: T[],
    total: number,
    options: PaginationOptions,
    messageKey?: string,
  ): ApiResponse<T[]> {
    const page = options.page || 1;
    const perPage = options.perPage || 10;
    const totalPages = Math.ceil(total / perPage);

    const meta: PaginationMeta = {
      page,
      perPage,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: messageKey
        ? this.trans.t(messageKey)
        : this.trans.t('common.success'),
      data,
      meta,
    };
  }

  /**
   * Error response (use in rare cases where you need to return error without throwing).
   *
   * Usage:
   *   return this.response.error('user.not_found', HttpStatus.NOT_FOUND);
   */
  error(
    messageKey: string,
    statusCode = HttpStatus.BAD_REQUEST,
    errors?: any,
    args?: Record<string, any>,
  ): ApiResponse<null> {
    return {
      success: false,
      statusCode,
      message: this.trans.t(messageKey, { args }),
      data: null,
      errors,
    };
  }
}

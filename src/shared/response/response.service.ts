import { Injectable } from '@nestjs/common';
import { TranslationService } from '../i18n/translation.service';
import { ApiResponse, PaginationMeta, PaginationOptions } from './response.interface';

@Injectable()
export class ResponseService {
  constructor(private trans: TranslationService) {}

  success<T>(data: T, messageKey?: string, args?: Record<string, any>): ApiResponse<T> {
    return {
      success: true,
      message: messageKey
        ? this.trans.t(messageKey, { args })
        : this.trans.t('common.success'),
      data,
    };
  }

  message(messageKey: string, args?: Record<string, any>): ApiResponse<null> {
    return {
      success: true,
      message: this.trans.t(messageKey, { args }),
      data: null,
    };
  }

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
      message: messageKey
        ? this.trans.t(messageKey)
        : this.trans.t('common.success'),
      data,
      meta,
    };
  }

  error(messageKey: string, errors?: any, args?: Record<string, any>): ApiResponse<null> {
    return {
      success: false,
      message: this.trans.t(messageKey, { args }),
      data: null,
      errors,
    };
  }
}

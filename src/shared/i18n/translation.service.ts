import { Injectable } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';

export interface TranslateOptions {
  args?: Record<string, any>;
  lang?: string;
}

@Injectable()
export class TranslationService {
  constructor(private readonly i18n: I18nService) {}

  /**
   * Translate a key using the current request's language context.
   * Falls back to the default language if no context is available.
   *
   * @example
   * this.trans.t('user.not_found')
   * this.trans.t('user.created', { args: { name: 'Ahmed' } })
   * this.trans.t('common.success', { lang: 'ar' })
   */
  t(key: string, options?: TranslateOptions): string {
    const lang = options?.lang || I18nContext.current()?.lang;

    return this.i18n.t(key, {
      lang,
      args: options?.args,
    }) as string;
  }

  /**
   * Alias for t() — use whichever reads better in context.
   */
  translate(key: string, options?: TranslateOptions): string {
    return this.t(key, options);
  }
}

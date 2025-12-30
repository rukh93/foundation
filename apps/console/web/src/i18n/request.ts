import { COOKIE_NAME_LOCALE } from '@repo/ui/constants/system';
import { cookies } from 'next/headers';
import { getRequestConfig, type RequestConfig } from 'next-intl/server';

import { defaultLocale } from '@/i18n/config';

export default getRequestConfig(async (): Promise<RequestConfig> => {
  // Provide a static locale, fetch a user setting,
  // read from `cookies()`, `headers()`, etc.
  const cookieStore = await cookies();
  const locale = cookieStore.get(COOKIE_NAME_LOCALE)?.value || defaultLocale;

  return {
    locale,
    messages: (await import(`../../locales/${locale}.json`)).default,
  };
});

'use server';

import { COOKIE_NAME_LOCALE } from '@repo/ui/constants/system';
import { cookies } from 'next/headers';

import { defaultLocale, Locale } from '@/i18n/config';

export async function getUserLocale() {
	const cookieStore = await cookies();

	return cookieStore.get(COOKIE_NAME_LOCALE)?.value || defaultLocale;
}

export async function setUserLocale(locale: Locale) {
	const cookieStore = await cookies();

	cookieStore.set(COOKIE_NAME_LOCALE, locale);
}

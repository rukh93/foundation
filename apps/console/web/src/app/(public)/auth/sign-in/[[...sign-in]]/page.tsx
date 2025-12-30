import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Logo } from '@/features/brand/components/logo';
import { getUserLocale } from '@/services/locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale();

  const t = await getTranslations({
    locale,
    namespace: 'SignInPage',
  });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted p-4 md:p-10 md:gap-6">
      <Link href="/">
        <Logo />
      </Link>
      <div className="flex w-full max-w-sm flex-col gap-4 md:gap-6">
        <SignIn />
      </div>
    </div>
  );
}

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@repo/ui/components/ui/empty';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function Page() {
  const t = useTranslations('Unauthorized');

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{t('title')}</EmptyTitle>
        <EmptyDescription>{t('description')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <EmptyDescription>
          {t.rich('contact', {
            link: (chunks) => (
              <Link className="underline hover:text-primary" href="/">
                {chunks}
              </Link>
            ),
          })}
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}

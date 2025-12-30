import { getTranslations } from 'next-intl/server';

import { getUser } from '@/app/(admin)/overview/actions';
import { PageWrapper } from '@/features/layout/components/page-wrapper';

export default async function Page() {
  const user = await getUser();

  console.log(user);

  const t = await getTranslations('OverviewPage');

  return (
    <PageWrapper title={t('title')} subtitle={t('subtitle')}>
      Overview
    </PageWrapper>
  );
}

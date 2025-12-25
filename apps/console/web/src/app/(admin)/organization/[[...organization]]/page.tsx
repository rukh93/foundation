import { OrganizationProfile } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { unauthorized } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { PageWrapper } from '@/features/layout/components/page-wrapper';

export default async function Page() {
	const { has } = await auth();

	if (!has({ role: 'org:admin' })) {
		unauthorized();
	}

	const t = await getTranslations('OrganizationPage');

	return (
		<PageWrapper
			title={t('title')}
			subtitle={t('subtitle')}
			page={t('title')}
		>
			<OrganizationProfile />
		</PageWrapper>
	)
}

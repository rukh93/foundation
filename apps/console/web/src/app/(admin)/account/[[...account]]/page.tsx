import { UserProfile } from '@clerk/nextjs';
import { getTranslations } from 'next-intl/server';

import { PageWrapper } from '@/features/layout/components/page-wrapper';

export default async function Page() {
	const t = await getTranslations('AccountPage');

	return (
		<PageWrapper
			title={t('title')}
			subtitle={t('subtitle')}
			page={t('title')}
		>
			<UserProfile />
		</PageWrapper>
	);
}

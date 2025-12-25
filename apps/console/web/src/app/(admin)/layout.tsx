import { auth } from '@clerk/nextjs/server';
import type { PropsWithChildren } from 'react';

import { AppSidebar } from '@/features/sidebar/components/sidebar';
import { accountGroups, generalGroups, organizationGroups } from '@/features/sidebar/navigation';

export default async function Layout({ children }: Readonly<PropsWithChildren>) {
	const { has, isAuthenticated, redirectToSignIn, getToken } = await auth();

	if (!isAuthenticated) return redirectToSignIn();

	const token = await getToken();

	if (!token) return redirectToSignIn();

	const groups = [...generalGroups, ...accountGroups, ...(has({ role: 'org:admin' }) ? organizationGroups : [])];

	return (
		<AppSidebar groups={groups}>{children}</AppSidebar>
	);
}

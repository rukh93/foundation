import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from '@repo/ui/components/ui/breadcrumb';
import type { Breadcrumb as BreadcrumbType } from '@repo/ui/types';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Fragment } from 'react';

type Props = {
	addHome?: boolean;
	breadcrumbs: BreadcrumbType[];
	page: string;
};

export function Breadcrumbs({ addHome = true, breadcrumbs, page }: Readonly<Props>) {
	const t = useTranslations('Theme');
	const items: BreadcrumbType[] = addHome
		? [{ href: '/', label: t('breadcrumbs.home') }, ...breadcrumbs]
		: breadcrumbs;

	return (
		<Breadcrumb>
			<BreadcrumbList>
				{items.map(({ href, label }: BreadcrumbType) => (
					<Fragment key={href}>
						<BreadcrumbItem>
							<BreadcrumbLink asChild>
								<Link href={href}>{label}</Link>
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
					</Fragment>
				))}
				<BreadcrumbItem>
					<BreadcrumbPage>{page}</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}

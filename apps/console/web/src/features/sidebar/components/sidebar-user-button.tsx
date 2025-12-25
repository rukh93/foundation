'use client';

import { SignOutButton, useAuth } from '@clerk/nextjs';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@repo/ui/components/ui/sidebar';
import { ChevronsUpDown, CreditCard, LogOut, Shield, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Routes } from '@/app/(admin)/routes';
import { UserAvatar } from '@/features/user/components/user-avatar';

export function SidebarUserButton() {
	const { isLoaded, isSignedIn, has } = useAuth();
	const t = useTranslations('Pages');
	const { isMobile } = useSidebar();

	if (!isLoaded || !isSignedIn) {
		return null;
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<UserAvatar />
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						side={isMobile ? 'bottom' : 'right'}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<UserAvatar />
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem asChild>
								<Link href={Routes.ACCOUNT_PROFILE}>
									<UserRound className="text-sidebar-accent-foreground" />
									{t('account')}
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link href={Routes.ACCOUNT_SECURITY}>
									<Shield className="text-sidebar-accent-foreground" />
									{t('security')}
								</Link>
							</DropdownMenuItem>
							{has({ role: 'org:admin' }) && (
								<DropdownMenuItem asChild>
									<Link href={Routes.ORGANIZATION_BILLING}>
										<CreditCard className="text-sidebar-accent-foreground" />
										{t('billing')}
									</Link>
								</DropdownMenuItem>
							)}
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<SignOutButton>
							<DropdownMenuItem>
								<LogOut className="text-sidebar-accent-foreground" />
								{t('logout')}
							</DropdownMenuItem>
						</SignOutButton>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@repo/ui/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
} from '@repo/ui/components/ui/sidebar';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { PropsWithChildren } from 'react';

import { Logo } from '@/features/brand/components/logo';
import { LogoIcon } from '@/features/brand/components/logo-icon';
import { SidebarUserButton } from '@/features/sidebar/components/sidebar-user-button';
import type { Group, GroupItem } from '@/features/sidebar/types';

type Props = PropsWithChildren<{
  groups: Group[];
}>;

export function AppSidebar({ children, groups }: Readonly<Props>) {
  const t = useTranslations('Pages');

  return (
    <SidebarProvider>
      <Sidebar className="sidebar" collapsible="icon">
        <SidebarHeader className="py-4 group-data-[state=collapsed]:items-center">
          <Logo className="group-data-[state=collapsed]:hidden" />
          <LogoIcon className="group-data-[state=expanded]:hidden group-data-[state=collapsed]:size-4 hidden md:block" />
        </SidebarHeader>
        <SidebarContent>
          {groups.map((group: Group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{t(group.title)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item: GroupItem) =>
                    item.items?.length ? (
                      <Collapsible key={item.title} asChild className="group/collapsible">
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={t(item.title)}>
                              {item.icon && <item.icon />}
                              <span>{t(item.title)}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.items?.map((item: GroupItem) => (
                                <SidebarMenuSubItem key={item.title}>
                                  <SidebarMenuSubButton asChild>
                                    {item.url && (
                                      <Link href={item.url}>
                                        <span>{t(item.title)}</span>
                                      </Link>
                                    )}
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    ) : (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild tooltip={t(item.title)}>
                          {item.url && (
                            <Link href={item.url}>
                              {item.icon && <item.icon />}
                              <span>{t(item.title)}</span>
                            </Link>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ),
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarUserButton />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}

import { ThemeToggle } from '@repo/ui/components/theme-toggle';
import { SidebarTrigger } from '@repo/ui/components/ui/sidebar';
import type { Breadcrumb } from '@repo/ui/types';
import type { PropsWithChildren, ReactNode } from 'react';

import { Breadcrumbs } from '@/features/theme/components/breadcrumbs';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  page?: string;
}>;

export async function PageWrapper({ children, title, subtitle, actions, breadcrumbs = [], page }: Readonly<Props>) {
  return (
    <>
      <header className="px-4 border-b border-solid border-border flex h-16 shrink-0 justify-between items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 w-full">
          <SidebarTrigger />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="p-4 md:p-6">
        {page && (
          <div className="mb-4">
            <Breadcrumbs breadcrumbs={breadcrumbs} page={page} />
          </div>
        )}
        <div className="flex flex-wrap w-full items-center mb-6 gap-4">
          <div className="flex-1">
            <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight lg:text-4xl">{title}</h1>
            {subtitle && <p className="leading-7 not-first:mt-2">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </>
  );
}

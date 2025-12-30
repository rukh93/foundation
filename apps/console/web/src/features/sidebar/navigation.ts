import { Building, CreditCard, GaugeCircle, Shield, UserRound, UsersRound } from 'lucide-react';

import { Routes } from '@/app/(admin)/routes';
import type { Group } from '@/features/sidebar/types';

export const generalGroups: Group[] = [
  {
    title: 'general',
    items: [
      {
        title: 'overview',
        icon: GaugeCircle,
        url: Routes.OVERVIEW,
      },
    ],
  },
];

export const accountGroups: Group[] = [
  {
    title: 'account',
    items: [
      {
        title: 'profile',
        icon: UserRound,
        url: Routes.ACCOUNT_PROFILE,
      },
      {
        title: 'security',
        url: Routes.ACCOUNT_SECURITY,
        icon: Shield,
      },
    ],
  },
];

export const organizationGroups: Group[] = [
  {
    title: 'organization',
    items: [
      {
        title: 'organization',
        icon: Building,
        url: Routes.ORGANIZATION_PROFILE,
      },
      {
        title: 'members',
        icon: UsersRound,
        url: Routes.ORGANIZATION_MEMBERS,
      },
      {
        title: 'billing',
        icon: CreditCard,
        url: Routes.ORGANIZATION_BILLING,
      },
    ],
  },
];

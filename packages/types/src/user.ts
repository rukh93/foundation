import type { Language } from './language';

export type UserStatus = 'Active' | 'Banned' | 'Inactive';

export type User = {
  id: string;
  clerkUserId: string;
  email: string;
  language: Language;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status: UserStatus;
};

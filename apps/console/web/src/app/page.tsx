import { redirect } from 'next/navigation';

import { Routes } from '@/app/(admin)/routes';

export default function Page() {
  redirect(Routes.OVERVIEW);
}

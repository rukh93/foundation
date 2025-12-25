'use server';

import { unauthorized } from 'next/navigation';

import { getSdk } from '@/lib/sdk.server';

export async function getUser() {
  const sdk = await getSdk();

  if (!sdk) {
    unauthorized();
  }

  return sdk.user.get();
}

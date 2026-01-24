'use server';

import type { OrganizationCreditBalance } from '@repo/types';
import { unauthorized } from 'next/navigation';

import { getSdk } from '@/lib/sdk.server';

type State = { ok: true; data: OrganizationCreditBalance | undefined; message: string } | { ok: false; message: string } | null;

export async function applyCredits(_prevState: State, formData: FormData): Promise<State> {
  const sdk = await getSdk();

  if (!sdk) {
    unauthorized();
  }

  const textRaw = formData.get('text');
  const amountRaw = formData.get('amount');

  const text = typeof textRaw === 'string' ? textRaw.trim() : '';
  const amount = typeof amountRaw === 'string' ? Number(amountRaw) : NaN;

  if (!text) {
    return { ok: false, message: 'Text is required.' };
  }

  if (!Number.isFinite(amount)) {
    return {
      ok: false,
      message: 'Amount must be a valid number (can be negative).',
    };
  }

  const data = await sdk.credits.apply(amount, text);

  if (!data.success) {
    return {
      ok: false,
      message: data.message,
    };
  }

  return {
    ok: true,
    data: data.data,
    message: 'Submitted successfully.'
  };
}

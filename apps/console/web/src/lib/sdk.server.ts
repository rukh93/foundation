import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { RepoSDK } from '@repo/sdk';

export async function getSdk() {
  const { isAuthenticated, getToken } = await auth();

  if (!isAuthenticated) return null;

  const token = await getToken();

  if (!token) return null;

  return new RepoSDK({ baseUrl: process.env.API_URL!, token });
}

import type { OrganizationCreditBalance } from '@repo/types';

import { SdkClient } from '../client';

export class CreditsResource {
  constructor(private readonly client: SdkClient) {}

  apply(delta: number, featureKey: string) {
    return this.client.request<OrganizationCreditBalance>({
      method: 'POST',
      path: '/credits/apply',
      body: { delta, featureKey },
    });
  }
}

import type { User } from '@repo/types';

import { SdkClient } from '../client';

export class UserResource {
  constructor(private readonly client: SdkClient) {}

  get() {
    return this.client.request<User>({
      method: 'GET',
      path: '/user/me',
    });
  }
}

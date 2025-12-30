export * from './errors';
export type * from './types';

import { SdkClient } from './client';
import { UserResource } from './resources/user';
import type { SdkClientOptions } from './types';

export class RepoSDK {
  readonly user: UserResource;

  constructor(opts: SdkClientOptions) {
    const client = new SdkClient(opts);

    this.user = new UserResource(client);
  }
}

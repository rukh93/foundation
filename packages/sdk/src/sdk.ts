import { SdkClient } from './client';
import { CreditsResource } from './resources/credits';
import { UserResource } from './resources/user';
import type { SdkClientOptions } from './types';

export class RepoSDK {
  readonly user: UserResource;
  readonly credits: CreditsResource;

  constructor(opts: SdkClientOptions) {
    const client = new SdkClient(opts);

    this.credits = new CreditsResource(client);
    this.user = new UserResource(client);
  }
}

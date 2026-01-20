import { CREDITS_MONTHLY_GRANT } from './constants';

export type GrantDispatchMessage = {
  kind: typeof CREDITS_MONTHLY_GRANT;
  organizationId: string;
  dispatchedAt: string;
};

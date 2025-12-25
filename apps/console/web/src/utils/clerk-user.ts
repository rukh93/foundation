import type { UserResource } from '@clerk/types';

type MaybeUser = UserResource | null | undefined;

const DEFAULT_NAME = 'John Doe';
const DEFAULT_INITIALS = 'JD';

export function getUserPrimaryEmail(user: MaybeUser): string | null {
	if (!user) return null;

	const primary = user.primaryEmailAddress;

	if (primary?.emailAddress) return primary.emailAddress;

	const first = user.emailAddresses?.[0];

	return first?.emailAddress ?? null;
}

export function getUserPrimaryPhone(user: MaybeUser): string | null {
	if (!user) return null;

	const primary = user.primaryPhoneNumber;

	if (primary?.phoneNumber) return primary.phoneNumber;

	const first = user.phoneNumbers?.[0];

	return first?.phoneNumber ?? null;
}

export function getUserDisplayName(user: MaybeUser): string {
	if (!user) return DEFAULT_NAME;

	const fullName = user.fullName ?? [user.firstName, user.lastName].filter(Boolean).join(' ');

	return fullName || DEFAULT_NAME;
}

export function getUserInitials(user: MaybeUser): string {
	if (!user) return DEFAULT_NAME;

	const name = getUserDisplayName(user);
	const [part, ...rest] = name.split(' ').filter(Boolean);

	if (!part) return DEFAULT_INITIALS;

	if (rest.length > 0) {
		const first = part[0];
		const last = rest[rest.length - 1]?.[0];

		return [first, last].filter(Boolean).join('').toUpperCase() || DEFAULT_INITIALS;
	}

	return part.slice(0, 2).toUpperCase();
}

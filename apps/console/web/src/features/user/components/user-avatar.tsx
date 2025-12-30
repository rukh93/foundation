'use client';

import { useUser } from '@clerk/nextjs';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components/ui/avatar';
import { Fragment } from 'react';

import { getUserDisplayName, getUserInitials, getUserPrimaryEmail, getUserPrimaryPhone } from '@/utils/clerk-user';

export function UserAvatar() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  const name = getUserDisplayName(user);
  const initials = getUserInitials(user);
  const email = getUserPrimaryEmail(user);
  const phone = getUserPrimaryPhone(user);

  return (
    <Fragment>
      <Avatar className="h-8 w-8 rounded-lg">
        <AvatarImage src={user.imageUrl} alt={name} />
        <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-xs">{email ?? phone}</span>
      </div>
    </Fragment>
  );
}

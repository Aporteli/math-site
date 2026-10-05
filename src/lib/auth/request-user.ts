import { cache } from 'react';
import { prisma } from '@/lib/prisma';

export type RequestUserRecord = {
  id: string;
  role: string;
  email: string;
  name: string;
};

const loadRequestUser = cache(async (key: string): Promise<RequestUserRecord | null> => {
  const splitAt = key.indexOf('\u0000');
  const userLookupId = splitAt === -1 ? key : key.slice(0, splitAt);
  const userLookupEmail = splitAt === -1 ? '' : key.slice(splitAt + 1);
  if (!userLookupId && !userLookupEmail) return null;

  return prisma.user.findFirst({
    where: {
      OR: [
        ...(userLookupId ? [{ id: userLookupId }] : []),
        ...(userLookupEmail ? [{ email: userLookupEmail }] : []),
      ],
    },
    select: { id: true, role: true, email: true, name: true },
  });
});

/** One user read per request. React's cache() does not outlive the request. */
export function findRequestUser(id: string, email: string): Promise<RequestUserRecord | null> {
  const userLookupId = id.trim();
  const userLookupEmail = email.trim().toLowerCase();
  if (!userLookupId && !userLookupEmail) return Promise.resolve(null);
  return loadRequestUser(`${userLookupId}\u0000${userLookupEmail}`);
}

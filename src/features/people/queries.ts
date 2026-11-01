'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { peopleApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import type { AppUser } from '@/lib/api/types';
import { useSession } from '@/providers/SessionProvider';
import { loadAllPages, mergeRoleHolders, PAGE_SIZE, personFromUser } from './people';

/**
 * Everybody who holds a role - approvers and vice approvers, plus the camp commanders for the super admin - merged into one list.
 * These people are few, so the lists are read whole (all pages) and searched in memory.
 */
export function useRoleHolders(enabled: boolean) {
  const { me } = useSession();
  const withAdmins = me.is_super_admin;

  return useQuery({
    queryKey: [...keys.roleHolders, withAdmins],
    enabled,
    queryFn: async ({ signal }) => {
      const [approvers, admins] = await Promise.all([
        loadAllPages((page) => peopleApi.approvers('', signal, page)),
        withAdmins ? loadAllPages((page) => peopleApi.admins('', signal, page)) : Promise.resolve([]),
      ]);
      return mergeRoleHolders(approvers, admins);
    },
  });
}

const toRows = (users: AppUser[]) => users.map(personFromUser);

/** One page (20) of `GET /users`, optionally narrowed by a number or name prefix. There is no total: a full page means there may be more. */
export function usePeoplePage(identifier: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: keys.users(identifier, page),
    enabled,
    queryFn: async ({ signal }) => (await peopleApi.users(identifier, page, signal)) ?? [],
    placeholderData: (previous) => previous,
    select: toRows,
  });
}

export interface PersonRef {
  uuid: string;
  personalNumber: string | null;
  personalId: string | null;
}

/**
 * The full record of one person (unit, department, every permission). The server has no "user by id" call, so the person is found
 * through the same search the screen uses - by personal number, or by ID number when there is none - and picked out by `uuid`.
 */
export async function findPerson(target: PersonRef, signal?: AbortSignal): Promise<AppUser | null> {
  const identifier = target.personalNumber ?? target.personalId;
  if (!identifier) return null;

  // a number is a prefix match: a 7 digit number also matches the 8 digit ones that start with it
  for (let page = 1; page <= 3; page++) {
    const rows = (await peopleApi.users(identifier, page, signal)) ?? [];
    const found = rows.find((row) => row.uuid === target.uuid);
    if (found) return found;
    if (rows.length < PAGE_SIZE) return null;
  }
  return null;
}

/** Read fresh every time the permissions dialog opens: nothing of it is kept once the dialog closes (`gcTime: 0`). */
export function usePerson(target: PersonRef) {
  return useQuery({
    queryKey: keys.person(target.uuid),
    queryFn: ({ signal }) => findPerson(target, signal),
    staleTime: 0,
    gcTime: 0,
  });
}

/**
 * After anything that changes who someone is or may do: the lists on the screen (and the "handlers" filter of the requests screen) are
 * read again. A person's own record and permissions are not refetched - they are re-read whenever a dialog opens.
 */
export function invalidatePeople(client: QueryClient): Promise<unknown> {
  return Promise.all([
    client.invalidateQueries({ queryKey: keys.usersAll, predicate: (query) => query.queryKey[1] !== 'person' }),
    client.invalidateQueries({ queryKey: keys.approversAll }),
    client.invalidateQueries({ queryKey: keys.permissionsAll, refetchType: 'none' }),
  ]);
}

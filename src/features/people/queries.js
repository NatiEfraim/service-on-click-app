'use client';

import { useQuery } from '@tanstack/react-query';
import { peopleApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';

import { useSession } from '@/providers/SessionProvider';
import { loadAllPages, mergeRoleHolders, PAGE_SIZE, personFromUser } from './people';

/** All role holders merged into one list; few enough to load whole and search in memory. */
export function useRoleHolders(enabled) {
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

const toRows = (users) => users.map(personFromUser);

/** One page (20) of `GET /users`, optionally narrowed by prefix. No total: a full page means more may exist. */
export function usePeoplePage(identifier, page, enabled) {
  return useQuery({
    queryKey: keys.users(identifier, page),
    enabled,
    queryFn: async ({ signal }) => (await peopleApi.users(identifier, page, signal)) ?? [],
    placeholderData: (previous) => previous,
    select: toRows,
  });
}



/** Full record of one person. No "user by id" endpoint, so it searches by number and picks the match by `uuid`. */
export async function findPerson(target, signal) {
  const identifier = target.personalNumber ?? target.personalId;
  if (!identifier) return null;

  // numbers match by prefix, so longer numbers may also match
  for (let page = 1; page <= 3; page++) {
    const rows = (await peopleApi.users(identifier, page, signal)) ?? [];
    const found = rows.find((row) => row.uuid === target.uuid);
    if (found) return found;
    if (rows.length < PAGE_SIZE) return null;
  }
  return null;
}

/** Read fresh on every dialog open; nothing is cached after close (`gcTime: 0`). */
export function usePerson(target) {
  return useQuery({
    queryKey: keys.person(target.uuid),
    queryFn: ({ signal }) => findPerson(target, signal),
    staleTime: 0,
    gcTime: 0,
  });
}

/** Refetch the people lists and the requests screen's handlers filter; dialogs re-read the record on open. */
export function invalidatePeople(client) {
  return Promise.all([
    client.invalidateQueries({ queryKey: keys.usersAll, predicate: (query) => query.queryKey[1] !== 'person' }),
    client.invalidateQueries({ queryKey: keys.approversAll }),
    client.invalidateQueries({ queryKey: keys.permissionsAll, refetchType: 'none' }),
  ]);
}

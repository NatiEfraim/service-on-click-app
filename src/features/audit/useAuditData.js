'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';
import { useSession } from '@/providers/SessionProvider';
import { parsePermissionName, roleLabel } from '@/features/people/permissions';

/** One value of before / after, readable: status ids by name, booleans as yes / no. */
export function useShowValue() {
  const { statusLabel, typeName } = useSession();
  // "admin_8" → "מפקד מחנה - הובלות"
  const permission = (name) => {
    const parsed = parsePermissionName(String(name));
    return parsed ? `${roleLabel(parsed.role)} - ${typeName(parsed.bookingTypeId)}` : roleLabel(String(name));
  };
  return (key, value) => {
    if (Array.isArray(value) && (key === 'permissions' || key === 'roles')) return value.length ? value.map(permission).join(', ') : 'ללא';
    if (value === undefined || value === null || value === '') return '—';
    if ((key === 'status_id' || key === 'parked_status_id') && typeof value === 'number') return statusLabel(value);
    if (typeof value === 'boolean') return value ? 'כן' : 'לא';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  };
}

/** Super admin: who changed what and when, newest first; a row opens its before / after. */
/** One filtered audit list, page by page (`enabled` off: an idle query that returns nothing). */
export function useAuditPages(params, enabled) {
  return useInfiniteQuery({
    queryKey: keys.audit(params),
    queryFn: ({ pageParam, signal }) => auditApi.list({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.last_page ? last.meta.page + 1 : undefined),
    placeholderData: (previous) => previous,
    enabled,
  });
}

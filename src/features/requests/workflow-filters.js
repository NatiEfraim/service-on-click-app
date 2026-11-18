import { STAGE_FILTER_ORDER } from '@/lib/labels';
import { topicHandlerRole } from '@/lib/topicTypes';

const COMMON_STATUSES = [1, 15, 16, 3, 4, 5, 6, 7];
const TERMINAL = new Set([4, 5, 6, 7, 12, 13]);
/** Mirror the API's stageOf rules, scoped by its per-type catalog and the user's access. */
export function workflowFilterOptions(me, catalog, selectedTypes = '') {
  const permitted = new Set((me.managed_booking_types ?? []).map(Number));
  const selected = String(selectedTypes).split(',').filter(Boolean).map(Number);
  const types = (catalog.booking_types ?? []).filter((type) => (me.is_super_admin || permitted.has(Number(type.id))) && (!selected.length || selected.includes(Number(type.id))));
  const stages = new Set();
  const statuses = new Set();
  for (const type of types) {
    const barber = type.name === 'barber_booking' || Number(type.id) === 5;
    const ids = (catalog.booking_type_statuses?.[String(type.id)] ?? (barber ? [1, 6, 11, 12, 13] : COMMON_STATUSES)).map(Number);
    if (topicHandlerRole(type.id)) stages.add('topic_handler');
    const officer = ids.some((id) => [14, 17, 18].includes(id));
    for (const id of ids) {
      statuses.add(id);
      if (barber) { stages.add(TERMINAL.has(id) || id === 11 ? 'closed' : 'barber'); continue; }
      if (TERMINAL.has(id)) stages.add('closed');
      else if (id === 1) stages.add(officer ? 'control_officer' : 'vice_approver');
      else if ([14, 17, 18].includes(id)) stages.add('vice_approver');
      else if ([2, 15, 16].includes(id)) stages.add('approver');
      else if (id === 3) stages.add('realization');
      else if (id === 8) stages.add('supplier_files');
      else if (id === 9) stages.add('supplier_approval');
      else if (id === 10) stages.add('supplier_number');
    }
  }
  return {
    stages: [...STAGE_FILTER_ORDER, 'topic_handler', 'closed'].filter((stage) => stages.has(stage)),
    statuses: (catalog.statuses ?? []).filter((status) => statuses.has(Number(status.id))),
  };
}

/** A new domain or a role change must not leave an impossible hidden filter selected. */
export function normalizeWorkflowFilters(filters, me, catalog) {
  const options = workflowFilterOptions(me, catalog, filters.types);
  const validStatuses = new Set(options.statuses.map((status) => String(status.id)));
  return { ...filters,
    stage: options.stages.includes(filters.stage) ? filters.stage : '',
    statuses: String(filters.statuses ?? '').split(',').filter((id) => validStatuses.has(id)).join(','),
  };
}

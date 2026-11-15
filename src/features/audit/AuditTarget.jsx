'use client';

import { Icon } from '@/components/ui/Icon';
import { useBookingDrawer } from '@/features/bookings/useBookingDrawer';
import { ENTITY_LABEL } from './labels';
import { useTargetPerson } from './useTargetPerson';

/** What a row acted on, by name: a booking by number, a person by full name, else the entity. */
export function AuditTarget({ row, onPeek }) {
  const person = useTargetPerson(row);
  const drawer = useBookingDrawer();
  if (row.booking_serial) {
    return (
      <span className="audit-booking">
        קריאה {row.booking_serial}
        {/* the same booking panel the other screens open, from the side */}
        <button
          type="button"
          className="audit-peek-btn"
          aria-label={`פרטי קריאה ${row.booking_serial}`}
          data-tip="פרטי הקריאה"
          onClick={(event) => {
            event.stopPropagation();
            onPeek?.(row.id);
            drawer.open(row.booking_serial);
          }}
        >
          <Icon name="eye" />
        </button>
      </span>
    );
  }
  if (person) return person.name ?? (person.loading ? 'טוען...' : `משתמש ${person.personalNumber}`);
  return row.entity_id ? `${ENTITY_LABEL[row.entity_type] ?? row.entity_type} ${row.entity_id}` : (ENTITY_LABEL[row.entity_type] ?? row.entity_type);
}

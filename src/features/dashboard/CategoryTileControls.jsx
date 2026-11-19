'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { domainColor } from '@/lib/labels';
import { TileBody } from './TileBody';

export function InlineCategoryGroup({ tile, index }) {
  const face = useRef(null);
  const menuId = useId();
  const [open, setOpen] = useState(false);

  return (
    <div
      className="dtile dgroup"
      data-open={open || undefined}
      style={{ '--dc': domainColor(tile.members[0].booking_type_id), '--i': index }}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setOpen(true); }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && !event.currentTarget.contains(document.activeElement)) setOpen(false);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        event.stopPropagation();
        setOpen(false);
        face.current?.focus();
      }}
    >
      <button
        ref={face}
        type="button"
        className="dgroup-face"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(true)}
      >
        <TileBody iconType={tile.iconType} iconSrc={tile.iconSrc} name={tile.name} open={tile.open} overdue={tile.overdue} playOn="state" />
      </button>
      <div id={menuId} className="dgroup-menu" data-members={tile.members.length} inert={!open}>
        {tile.members.map((domain) => (
          <Link key={domain.booking_type_id} href={`/dashboard?types=${domain.booking_type_id}`} className="dgroup-item" style={{ '--dc': domainColor(domain.booking_type_id) }}>
            <TileBody iconType={domain.booking_type_id} name={domain.name} open={domain.open} overdue={domain.overdue} />
          </Link>
        ))}
      </div>
    </div>
  );
}

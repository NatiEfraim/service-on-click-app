'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from '@/components/ui/usePresence';
import { domainColor } from '@/lib/labels';
import { DomainLine, TileBody } from './TileBody';

/** How long the panel takes to fade out (dashboard.css: .dpop[data-closing]); also the grace to move into it. */
const POP_EXIT_MS = 150;
const CLOSE_DELAY_MS = 140;
/** The panel's widest; it is narrowed to the window. */
const POP_MAX_WIDTH = 720;

/**
 * A group tile whose domains fall into sub-groups (תקשוב: הרשאות, התקנות, תקלות, ניהול משתמשים): too many to show inside
 * the tile, so hovering or activating it opens a panel under it - wide enough to read - with a column per sub-group
 * and each domain as a clear line (its picture, full name and open count), each linking to its own dashboard. The panel
 * stays inside the window, stays open while the pointer moves from the tile into it, fades in and out, and closes with
 * Escape.
 */
export function GroupTile({ tile, subs, index }) {
  const anchor = useRef(null);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState(null);
  const closeTimer = useRef(0);
  const presence = usePresence(open, POP_EXIT_MS);

  const show = () => {
    window.clearTimeout(closeTimer.current);
    // measured once, when it opens: moving into the panel (or the tile settling) must never move it
    if (open) return;
    const rect = anchor.current?.getBoundingClientRect();
    if (rect) {
      const width = Math.min(POP_MAX_WIDTH, window.innerWidth - 32);
      const left = Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), window.innerWidth - 16 - width);
      setPlace({ top: rect.bottom + 8, left, width });
    }
    setOpen(true);
  };
  const hide = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onScroll = () => setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={anchor}
        className={`dtile dgroup-pop${open ? ' open' : ''}`}
        onClick={show}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${tile.name}: ${tile.members.map((member) => member.name).join(', ')}`}
        style={{ '--dc': domainColor(tile.members[0].booking_type_id), '--i': index }}
        onMouseEnter={show}
        onMouseLeave={open ? hide : undefined}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget) && !document.querySelector('.dpop')?.contains(event.relatedTarget)) hide();
        }}
      >
        <TileBody iconType={tile.iconType} iconSrc={tile.iconSrc} name={tile.name} open={tile.open} overdue={tile.overdue} />
      </button>
      {presence.mounted && place
        ? createPortal(
            <div
              className="dpop"
              role="dialog"
              aria-label={tile.name}
              data-closing={presence.closing || undefined}
              style={{ top: place.top, left: place.left, width: place.width, '--cols': subs.length }}
              onMouseEnter={show}
              onMouseLeave={hide}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget) && !anchor.current?.contains(event.relatedTarget)) hide();
              }}
            >
              <header className="dpop-head">
                <b>{tile.name}</b>
                <span>{tile.open} פתוחות</span>
              </header>
              <div className="dpop-cols">
                {subs.map((sub, column) => (
                  <section key={sub.name} className="dpop-col" style={{ '--c': column }}>
                    <h4>
                      {sub.name}
                      <span>{sub.members.reduce((sum, member) => sum + member.open, 0)}</span>
                    </h4>
                    {sub.members.map((domain) => (
                      <Link
                        key={domain.booking_type_id}
                        href={`/dashboard?types=${domain.booking_type_id}`}
                        className="dpop-line"
                        style={{ '--dc': domainColor(domain.booking_type_id) }}
                        aria-label={`${domain.name}: ${domain.open} פתוחות`}
                      >
                        <DomainLine iconType={domain.booking_type_id} name={domain.name} open={domain.open} />
                      </Link>
                    ))}
                  </section>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from '@/components/ui/usePresence';
import { DRAWER_EXIT_MS } from '@/lib/motion';
import { useWindowMeasure } from '@/components/ui/useWindowMeasure';

/**
 * A copy of the table row whose booking is open in the side panel, brought forward: above the panel's dimming, joined to
 * the panel's edge, with all the row's columns fitted into the room the panel leaves (the row itself runs on under the
 * panel). The cells are copied from the row on screen, so any table can use it.
 * It follows the row through the panel's opening (which can shift the page a frame or two), and keeps its last place
 * while it leaves, so it never jumps or vanishes mid-way.
 */
function RowCopy({ rowKey, closing }) {
  const [box, setBox] = useState(null);
  const copy = useRef(null);
  const closingRef = useRef(closing);
  useEffect(() => {
    closingRef.current = closing;
  });

  // followed frame by frame through the panel's opening (450ms), then on resize / scroll
  useWindowMeasure(true, () => {
    const tr = document.querySelector(`tr[data-preview-row="${CSS.escape(String(rowKey))}"]`);
    const scroller = tr?.closest('.queue-scroll');
    if (!tr || !scroller) return closingRef.current ? undefined : setBox(null);
    const bounds = tr.getBoundingClientRect();
    const view = scroller.getBoundingClientRect();
    const headerBottom = scroller.querySelector('thead')?.getBoundingClientRect().bottom ?? view.top;
    // out of the table's view: no copy (the row itself is not visible either)
    if (bounds.top < headerBottom || bounds.bottom > view.bottom) return closingRef.current ? undefined : setBox(null);
    const widths = Array.from(tr.cells, (cell) => cell.getBoundingClientRect().width);
    const next = {
      '--row-top': `${bounds.top}px`,
      '--row-left': `${bounds.left}px`,
      '--row-height': `${bounds.height}px`,
      // the row's own proportions, squeezed into the room the panel leaves
      '--row-columns': widths.map((width) => `minmax(0, ${width}fr)`).join(' '),
      cells: widths.length,
    };
    // a new object only when something moved, so a still row never re-renders
    setBox((previous) => (previous && Object.keys(next).every((key) => previous[key] === next[key]) ? previous : next));
  }, [rowKey], { followMs: 450 });

  // the cells' content, copied from the row (a snapshot: the row does not change while its booking is open)
  const cellCount = box?.cells ?? 0;
  useLayoutEffect(() => {
    const tr = document.querySelector(`tr[data-preview-row="${CSS.escape(String(rowKey))}"]`);
    if (!tr || !copy.current) return;
    Array.from(copy.current.children).forEach((span, index) => {
      const cell = tr.cells[index];
      span.replaceChildren(...(cell ? Array.from(cell.childNodes, (node) => node.cloneNode(true)) : []));
    });
  }, [rowKey, cellCount]);

  if (!box) return null;
  const { cells, ...style } = box;
  return createPortal(
    <div ref={copy} className="audit-row-preview" data-closing={closing || undefined} style={style} dir="rtl" aria-hidden="true" inert>
      {Array.from({ length: cells }, (_, index) => <span key={index} />)}
    </div>,
    document.body,
  );
}

/**
 * The selected-row effect for a table whose rows open the booking side panel. Give it the key of the row that is open
 * (null when none); put `rowAttrs(key)` and `rowClass(key)` on each row, and render `node` once.
 * - the row's own content fades out while its copy is up, and back in as the copy leaves (styles: .audit-row-peek)
 * - closing: the copy stays for the panel's exit (DRAWER_EXIT_MS) and fades back with it
 * - stepping to another row (‹ › or ↑ ↓): the previous copy plays its exit while the next one comes in (a cross-fade)
 * The table's scroller must be a `.queue-scroll` with a `<thead>`.
 */
export function useRowPreview(selectedKey) {
  const open = selectedKey !== null && selectedKey !== undefined;
  const presence = usePresence(open, DRAWER_EXIT_MS);
  const [last, setLast] = useState(null);
  if (open && selectedKey !== last) setLast(selectedKey);
  const shown = open ? selectedKey : presence.mounted ? last : null;
  const closing = presence.closing;

  const [current, setCurrent] = useState(null);
  const [leaving, setLeaving] = useState(null);
  if (shown !== current) {
    if (current !== null && shown !== null) setLeaving(current);
    setCurrent(shown);
  }
  useEffect(() => {
    if (leaving === null) return undefined;
    const timer = window.setTimeout(() => setLeaving(null), DRAWER_EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  // a row reached with ‹ › or ↑ ↓ may be out of view, and its table is locked while the panel is open: bring it in
  useEffect(() => {
    if (!open) return;
    document.querySelector(`tr[data-preview-row="${CSS.escape(String(selectedKey))}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open, selectedKey]);

  return {
    rowClass: (key) => (shown !== null && key === shown ? ' audit-row-peek' : ''),
    rowAttrs: (key) => ({ 'data-preview-row': String(key), 'data-closing': shown !== null && key === shown && closing ? true : undefined }),
    node: (
      <>
        {leaving !== null && leaving !== shown ? <RowCopy key={`leaving-${leaving}`} rowKey={leaving} closing /> : null}
        {shown !== null ? <RowCopy key={`shown-${shown}`} rowKey={shown} closing={closing} /> : null}
      </>
    ),
  };
}

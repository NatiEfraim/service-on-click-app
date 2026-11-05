'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePresence } from './usePresence';

/** Space kept between the cursor and the card, and from the window's edges. */
const GAP = 14;

/**
 * Hover card for a chart mark: a colour dot, a title, the count in large digits and an optional line under it.
 * It follows the cursor, flips to the other side near a window edge, and fades in and out (rendered in <body>).
 *
 * Usage: `const tip = useChartTooltip();` then spread `tip.bind({ ... })` on each mark and render `tip.node` once.
 */
export function useChartTooltip() {
  // the content stays after the mouse leaves, so the card keeps it while it fades out
  const [content, setContent] = useState(null);
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const presence = usePresence(open);

  const bind = useCallback(
    (data) => ({
      onMouseEnter: (event) => {
        setPoint({ x: event.clientX, y: event.clientY });
        setContent(data);
        setOpen(true);
      },
      onMouseMove: (event) => setPoint({ x: event.clientX, y: event.clientY }),
      onMouseLeave: () => setOpen(false),
      // keyboard: the card sits by the focused mark
      onFocus: (event) => {
        const box = event.currentTarget.getBoundingClientRect();
        setPoint({ x: box.left + box.width / 2, y: box.top });
        setContent(data);
        setOpen(true);
      },
      onBlur: () => setOpen(false),
    }),
    [],
  );

  const node = presence.mounted ? <ChartTooltipCard data={content} point={point} closing={presence.closing} /> : null;
  return { bind, node };
}

function ChartTooltipCard({ data, point, closing }) {
  const ref = useRef(null);
  const [place, setPlace] = useState(null);

  // above the cursor and to its start (rtl: right); flipped below / to the other side when the window has no room
  useLayoutEffect(() => {
    const card = ref.current;
    if (!card) return;
    const { offsetWidth: width, offsetHeight: height } = card;
    const left = point.x - width - GAP >= GAP ? point.x - width - GAP : Math.min(point.x + GAP, window.innerWidth - width - GAP);
    const top = point.y - height - GAP >= GAP ? point.y - height - GAP : Math.min(point.y + GAP, window.innerHeight - height - GAP);
    setPlace({ left, top });
  }, [point.x, point.y, data]);

  if (!data) return null;
  return createPortal(
    <div
      ref={ref}
      className="chart-tip"
      role="tooltip"
      data-closing={closing || undefined}
      style={place ? { left: place.left, top: place.top } : { left: 0, top: 0, visibility: 'hidden' }}
    >
      <span className="chart-tip-head">
        {data.color ? <i style={{ background: data.color }} aria-hidden="true" /> : null}
        {data.title}
      </span>
      <b className="chart-tip-value">
        {data.value}
        {data.unit ? <span> {data.unit}</span> : null}
      </b>
      {data.sub ? <span className="chart-tip-sub">{data.sub}</span> : null}
    </div>,
    document.body,
  );
}

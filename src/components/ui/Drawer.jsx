'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DRAWER_EXIT_MS, EASE_DRAWER } from '@/lib/motion';
import { Button } from './Button';
import { useOverlay } from './overlay';
import { useExitGhost } from './useExitGhost';
import { useIsClient } from './useIsClient';

const FADE_OUT = [{ opacity: 1 }, { opacity: 0 }];
/** Back out the way it came in: to the left edge it sits on. */
const SLIDE_OUT = [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }];

function DrawerInner({ title, label, onClose, tools, scrollKey, children }) {
  const ref = useRef(null);
  const scrimRef = useRef(null);
  const closeRef = useRef(null);
  const scrollRef = useRef(null);
  // a new item in the same panel (e.g. the next booking) starts from the top
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [scrollKey]);
  useOverlay(ref, { onEscape: onClose, initialFocus: closeRef });
  const [exitParts] = useState(() => [{ ref: scrimRef, frames: FADE_OUT }, { ref, frames: SLIDE_OUT }]);
  useExitGhost(exitParts, { duration: DRAWER_EXIT_MS, easing: EASE_DRAWER });

  return (
    <>
      <div ref={scrimRef} className="scrim" onClick={onClose} />
      <aside ref={ref} className="drawer" role="dialog" aria-modal="true" aria-label={label}>
        <header>
          <h2>{title}</h2>
          <span style={{ flex: 1 }} />
          {tools}
          <Button ref={closeRef} size="sm" onClick={onClose}>
            סגירה
          </Button>
        </header>
        <div ref={scrollRef} className="scroll">{children}</div>
      </aside>
    </>
  );
}

/** Side panel the booking opens in; slides in from the right edge and back out to it. */
export function Drawer(props) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(<DrawerInner {...props} />, document.body);
}

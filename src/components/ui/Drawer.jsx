'use client';

import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { useOverlay } from './overlay';
import { useIsClient } from './useIsClient';



function DrawerInner({ title, label, onClose, children }) {
  const ref = useRef(null);
  const closeRef = useRef(null);
  useOverlay(ref, { onEscape: onClose, initialFocus: closeRef });

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside ref={ref} className="drawer" role="dialog" aria-modal="true" aria-label={label}>
        <header>
          <h2>{title}</h2>
          <span style={{ flex: 1 }} />
          <Button ref={closeRef} size="sm" onClick={onClose}>
            סגירה
          </Button>
        </header>
        <div className="scroll">{children}</div>
      </aside>
    </>
  );
}

/** Side panel the booking opens in. */
export function Drawer(props) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(<DrawerInner {...props} />, document.body);
}

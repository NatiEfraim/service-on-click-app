'use client';

import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { useOverlay } from './overlay';
import { useIsClient } from './useIsClient';

interface DrawerProps {
  title: ReactNode;
  label: string;
  onClose: () => void;
  children: ReactNode;
}

function DrawerInner({ title, label, onClose, children }: DrawerProps) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
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
export function Drawer(props: DrawerProps) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(<DrawerInner {...props} />, document.body);
}

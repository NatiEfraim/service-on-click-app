'use client';

import { useState } from 'react';
import { initials } from '@/lib/format';
import { ROLE_NAME } from '@/lib/labels';
import { useSession } from '@/providers/SessionProvider';
import { Icon } from '@/components/ui/Icon';
import { usePresence } from '@/components/ui/usePresence';
import { useDismiss, useHoverOpen } from './menuHooks';

export function UserMenu() {
  const { me, unitName, signOut } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const hover = useHoverOpen(setOpen);
  const presence = usePresence(open);

  const name = me.user.full_name ?? me.user.personal_number;
  const roles = me.is_super_admin
    ? ROLE_NAME.super_admin
    : me.roles
        .map((role) => ROLE_NAME[role] ?? role)
        .filter((label) => label !== ROLE_NAME.user)
        .join(', ');

  return (
    <div className="dd" ref={ref} {...hover}>
      <button type="button" className="userbtn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="avatar">{initials(name)}</span>
        <span className="nm">
          {name}
          <small>{roles}</small>
        </span>
        <Icon name="down" />
      </button>
      {presence.mounted ? (
        <div className="menu end" data-closing={presence.closing || undefined} style={{ minWidth: 280 }}>
          <div style={{ padding: 10 }}>
            <b>{name}</b>
            <div className="small muted">
              {roles || 'ללא תפקיד'} · {unitName(me.user.unit_id)}
            </div>
            <div className="small muted">
              מספר אישי <span className="serial">{me.user.personal_number}</span>
            </div>
          </div>
          <button type="button" className="mi" onClick={() => void signOut()}>
            <Icon name="logout" />
            התנתקות
          </button>
        </div>
      ) : null}
    </div>
  );
}

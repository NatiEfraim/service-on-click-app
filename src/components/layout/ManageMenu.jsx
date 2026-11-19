'use client';

import Link from 'next/link';
import { isActivePath } from '@/lib/nav';
import { Icon } from '@/components/ui/Icon';
import { useDropdown } from './menuHooks';

export function ManageMenu({ group, pathname, onNavigate }) {
  const { open, setOpen, toggle, ref, hover, presence } = useDropdown();
  const current = group.items.some((item) => isActivePath(pathname, item.href, item.also));

  return (
    <div className={`dd${current ? ' current' : ''}`} ref={ref} {...hover}>
      <button type="button" aria-haspopup="true" aria-expanded={open} onClick={toggle}>
        {group.label}
        <Icon name="down" />
      </button>
      {presence.mounted ? (
        <div className="menu" data-closing={presence.closing || undefined}>
          {group.items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActivePath(pathname, item.href, item.also) ? 'page' : undefined}
              onClick={() => {
                setOpen(false);
                onNavigate();
              }}
            >
              <span>
                {item.label}
                <small>{item.description}</small>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

import type { CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import { domainColor, domainIconSrc } from '@/lib/labels';

/** The service domain's own illustration (the external system's icons) in a white rounded square; a generic icon when it has none. */
export function DomainBadge({ bookingTypeId, size }: { bookingTypeId: number; size?: 'sm' }) {
  const src = domainIconSrc(bookingTypeId);
  return (
    <span className={`dom${size === 'sm' ? ' sm' : ''}`} style={{ '--dc': domainColor(bookingTypeId) } as CSSProperties}>
      {src ? (
        // static svg from /public: nothing to optimise
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        <Icon name="layers" />
      )}
    </span>
  );
}

/** The small inline version, for lists and tables. */
export function DomainIcon({ bookingTypeId }: { bookingTypeId: number }) {
  const src = domainIconSrc(bookingTypeId);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img className="dico" src={src} alt="" width={18} height={18} /> : <Icon name="layers" />;
}

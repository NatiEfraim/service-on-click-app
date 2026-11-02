
import { Icon } from '@/components/ui/Icon';
import { domainColor, domainIconSrc } from '@/lib/labels';

/** The domain's own illustration in a rounded square; a generic icon when it has none. */
export function DomainBadge({ bookingTypeId, size }) {
  const src = domainIconSrc(bookingTypeId);
  return (
    <span className={`dom${size === 'sm' ? ' sm' : ''}`} style={{ '--dc': domainColor(bookingTypeId) }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        <Icon name="layers" />
      )}
    </span>
  );
}

export function DomainIcon({ bookingTypeId }) {
  const src = domainIconSrc(bookingTypeId);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img className="dico" src={src} alt="" width={18} height={18} /> : <Icon name="layers" />;
}


import { Icon } from '@/components/ui/Icon';
import { domainColor, domainIconSrc } from '@/lib/labels';
import { hasTypeIcon, TypeIcon } from './TypeIcon';

/** The domain's own illustration in a rounded square; a generic icon when it has none. */
export function DomainBadge({ bookingTypeId, size }) {
  const src = domainIconSrc(bookingTypeId);
  // the ICT types 20-25 have an interactive picture of their own
  if (hasTypeIcon(bookingTypeId)) {
    return (
      <span className={`dom${size === 'sm' ? ' sm' : ''}`} style={{ '--dc': domainColor(bookingTypeId) }}>
        <TypeIcon bookingTypeId={bookingTypeId} />
      </span>
    );
  }
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

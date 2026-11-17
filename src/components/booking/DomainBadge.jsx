import { domainColor } from '@/lib/labels';
import { TypePicture } from './TypePicture';

/** The domain's picture (TypePicture) in a rounded square tinted with the domain's colour. */
export function DomainBadge({ bookingTypeId, size }) {
  return (
    <span className={`dom${size === 'sm' ? ' sm' : ''}`} style={{ '--dc': domainColor(bookingTypeId) }}>
      <TypePicture typeId={bookingTypeId} />
    </span>
  );
}

/** The domain's picture alone, small (18px), for inline use. */
export function DomainIcon({ bookingTypeId }) {
  return <TypePicture typeId={bookingTypeId} size={18} className="dico" />;
}

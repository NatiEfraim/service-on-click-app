'use client';

import { hasTypeIcon, TypeIcon } from '@/components/booking/TypeIcon';
import { Icon } from '@/components/ui/Icon';
import { domainIconSrc } from '@/lib/labels';

/** A domain's small picture: its interactive one (TypeIcon) for the ICT types 20-25, else its illustration. */
function DomainPicture({ iconType, iconSrc, size }) {
  const src = iconSrc ?? domainIconSrc(iconType);
  if (!iconSrc && hasTypeIcon(iconType)) return <TypeIcon bookingTypeId={iconType} size={size} />;
  // eslint-disable-next-line @next/next/no-img-element -- static svg
  return src ? <img src={src} alt="" width={size} height={size} /> : <Icon name="layers" />;
}

/** One domain as a compact line (a group tile split by sub-group): its picture, name and open count. */
export function DomainLine({ iconType, name, open }) {
  return (
    <>
      <span className="dline-ic"><DomainPicture iconType={iconType} size={22} /></span>
      <span className="dline-name">{name}</span>
      <b className="dline-n">{open}</b>
    </>
  );
}

/** Icon, name and counts of a domain tile (or of a group, or of one domain inside an opened group). */
export function TileBody({ iconType, iconSrc, name, open, overdue }) {
  return (
    <>
      <span className="dtile-ic">
        <DomainPicture iconType={iconType} iconSrc={iconSrc} size={36} />
      </span>
      <span className="dtile-name">{name}</span>
      <span className="dtile-meta">
        <b>{open}</b> פתוחות{overdue ? <> · <span className="bad-t">{overdue} חורגות</span></> : null}
      </span>
    </>
  );
}

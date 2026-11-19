'use client';

import { TypePicture } from '@/components/booking/TypePicture';

/** One domain as a compact line (a group tile split by sub-group): its picture, name and open count. */
export function DomainLine({ iconType, name, open }) {
  return (
    <>
      <span className="dline-ic"><TypePicture typeId={iconType} size={22} /></span>
      <span className="dline-name">{name}</span>
      <b className="dline-n">{open}</b>
    </>
  );
}

/**
 * Icon, name and counts of a domain tile (or of a group, or of one domain inside an opened group). `playOn` is passed to
 * the picture: a group's face uses "state", so its picture stays open while the group's domains show (aria-expanded).
 */
export function TileBody({ iconType, iconSrc, name, open, overdue, playOn = 'hover' }) {
  return (
    <>
      <span className="dtile-ic">
        <TypePicture typeId={iconType} src={iconSrc} size={36} playOn={playOn} />
      </span>
      <span className="dtile-name">{name}</span>
      <span className="dtile-meta">
        <b>{open}</b> פתוחות{overdue ? <> · <span className="bad-t">{overdue} חורגות</span></> : null}
      </span>
    </>
  );
}

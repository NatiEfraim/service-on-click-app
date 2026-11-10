'use client';

import { Icon } from '@/components/ui/Icon';
import { domainIconSrc } from '@/lib/labels';

/** Icon, name and counts of a domain tile (or of a group, or of one domain inside an opened group). */
export function TileBody({ iconType, iconSrc, name, open, overdue }) {
  const src = iconSrc ?? domainIconSrc(iconType);
  return (
    <>
      <span className="dtile-ic">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- static svg
          <img src={src} alt="" width={36} height={36} />
        ) : (
          <Icon name="layers" />
        )}
      </span>
      <span className="dtile-name">{name}</span>
      <span className="dtile-meta">
        <b>{open}</b> פתוחות{overdue ? <> · <span className="bad-t">{overdue} חורגות</span></> : null}
      </span>
    </>
  );
}

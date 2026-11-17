'use client';

import { Icon } from '@/components/ui/Icon';
import { domainIconSrc } from '@/lib/labels';
import { hasTypeIcon, TypeIcon } from './TypeIcon';

/**
 * A booking type's (or a topic's) picture: its image - the one given, else the type's own illustration - else, for the
 * ICT types 20-25 that have no image, their interactive picture (TypeIcon), else a generic icon. `size` in px for both
 * (left to the CSS when not given). The one place that rule lives; frames around it (.dom, .ic) stay with the callers.
 */
export function TypePicture({ typeId, src, size, className }) {
  const url = src ?? (typeId != null ? domainIconSrc(typeId) : null);
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- static svg
    return <img className={className} src={url} alt="" width={size} height={size} />;
  }
  if (typeId != null && hasTypeIcon(typeId)) return <TypeIcon bookingTypeId={typeId} size={size} className={className} />;
  return <Icon name="layers" />;
}

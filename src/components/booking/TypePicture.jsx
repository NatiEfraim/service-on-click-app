'use client';

import { Icon } from '@/components/ui/Icon';
import { domainIconSrc } from '@/lib/labels';
import { hasTypeIcon, TypeIcon } from './TypeIcon';
import { CategoryArtwork, hasCategoryArtwork } from './CategoryArtwork';

/**
 * A booking type's (or a topic's) picture: its image - the one given, else the type's own illustration - else, for the
 * ICT types 20-25 that have no image, their interactive picture (TypeIcon), else a generic icon. `size` in px for both
 * (left to the CSS when not given). The one place that rule lives; frames around it (.dom, .ic) stay with the callers.
 */
/** `playOn` ("hover" | "click"): when an animated picture plays its full sequence (CategoryArtwork). */
export function TypePicture({ typeId, src, size, className = '', playOn = 'hover' }) {
  const url = src ?? (typeId != null ? domainIconSrc(typeId) : null);
  const isEquipmentIcon = url === '/icons/domains/3.svg' || url === '/icons/domains/4.svg';
  const pictureClass = isEquipmentIcon ? className : `type-picture ${className}`.trim();
  if (url && hasCategoryArtwork(url)) return <CategoryArtwork src={url} size={size} className={pictureClass} playOn={playOn} />;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- static svg
    return <img className={pictureClass} src={url} alt="" width={size} height={size} />;
  }
  if (typeId != null && hasTypeIcon(typeId)) return <TypeIcon bookingTypeId={typeId} size={size} className={pictureClass} />;
  return <Icon name="layers" className={pictureClass} />;
}

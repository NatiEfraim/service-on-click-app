'use client';

import { useId } from 'react';
import { CountBadge } from '@/components/ui/CountBadge';
import { Icon } from '@/components/ui/Icon';
import { topicOf } from '@/lib/topicTypes';
import { CATEGORY_ICONS } from './ServiceIcon';
import './categoryGroup.css';
import { Reveal } from '@/components/ui/Reveal';

/**
 * The three main categories of booking types (the roles & permissions guide), in this order, each with its interactive
 * picture (ServiceIcon) and the tint of its tile: the service domains, ביטחון מידע and תקשוב (lib/topicTypes).
 */
export const TOPIC_SECTIONS = [
  { id: 'service', label: 'מפקדת מחנה', tint: '#E8826A' },
  { id: 'infosec', label: 'ביטחון מידע', tint: '#8FB3E8' },
  { id: 'ict', label: 'תקשוב', tint: '#9ED3F0' },
];

/**
 * The main category of a booking type: 'infosec', 'ict', or 'service' for every other domain. By the type's topic, not
 * by its handler role: the clearance grant (14) belongs to ביטחון מידע although several roles work it (lib/routeTypes).
 */
export function sectionOf(bookingTypeId) {
  return topicOf(bookingTypeId) ?? 'service';
}

/**
 * Splits items into the main categories, in TOPIC_SECTIONS order, leaving out the empty ones:
 * [{ ...section, items }]. `typeOf(item)` gives the item's booking type id.
 */
export function groupBySection(items, typeOf) {
  return TOPIC_SECTIONS.map((section) => ({ ...section, items: items.filter((item) => sectionOf(typeOf(item)) === section.id) })).filter(
    (section) => section.items.length,
  );
}

/**
 * One main category that opens and closes: its header (the category's picture on a tinted tile, its name, a summary
 * line, an optional `badge`, a chevron; `count` puts a small red number on the picture - CountBadge) toggles the body, which glides open (grid rows 0fr ↔ 1fr) and stays mounted -
 * inert while closed - so it can close smoothly too. The picture plays its sequence on hover and on opening.
 */
export function CategoryGroup({ section, summary, open, onToggle, badge = null, count = 0, countLabel, className = '', children }) {
  const panelId = useId();
  const Picture = CATEGORY_ICONS[section.id];
  return (
    <section className={`pp-group${open ? ' open' : ''}${className ? ` ${className}` : ''}`}>
      <button type="button" className="pp-group-head" aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        {/* a main category has its picture on a tinted tile; a plain group (no picture, e.g. a topic's sub-group) has none */}
        {Picture ? (
          <span className="pp-group-ic" style={{ '--tint': section.tint }}><Picture /><CountBadge count={count} label={countLabel} /></span>
        ) : null}
        <span className="pp-group-txt">
          <b>{section.label}</b>
          {summary ? <span>{summary}</span> : null}
        </span>
        {badge}
        <Icon name="down" className="pp-group-chev" />
      </button>
      <Reveal id={panelId} open={open} fade={false} className="pp-group-body" innerClassName="pp-group-inner">
        {children}
      </Reveal>
    </section>
  );
}

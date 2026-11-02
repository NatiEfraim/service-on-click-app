import type { CSSProperties } from 'react';
import { Icon } from './Icon';

interface StatProps {
  icon: string;
  /** Accent of the icon tile and the bottom bar. */
  color: string;
  label: string;
  value: number | string;
  foot: string;
  /** Shows the value in the "bad" colour. */
  bad?: boolean;
  /** Makes the tile a button. */
  onClick?: () => void;
}

/** One headline number in a `.card.stats` row. */
export function Stat({ icon, color, label, value, foot, bad, onClick }: StatProps) {
  const body = (
    <>
      <span className="si">
        <Icon name={icon} />
      </span>
      <span className="l">{label}</span>
      <span className="v">{value}</span>
      <span className="f">{foot}</span>
    </>
  );
  const style = { '--sc': color } as CSSProperties;
  return onClick ? (
    <button type="button" className={`stat${bad ? ' bad' : ''}`} style={style} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="stat static" style={style}>
      {body}
    </div>
  );
}

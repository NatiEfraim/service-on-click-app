import { Icon } from './Icon';

/** One headline number in a `.card.stats` row; `index` places it in the row's stagger (`.stagger`). */
export function Stat({ icon, color, label, value, foot, bad, onClick, index = 0 }) {
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
  const style = { '--sc': color, '--i': index };
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

/** A small number box inside a card (a row of them in `.stat-tiles`); `tone` 'warn' or 'bad' colours the number. */
export function StatTile({ label, value, sub, tone = '' }) {
  return (
    <div className={`stat-tile${tone ? ` ${tone}` : ''}`}>
      <span className="stat-tile-label">{label}</span>
      <b>{value}</b>
      {sub ? <span className="hint">{sub}</span> : null}
    </div>
  );
}

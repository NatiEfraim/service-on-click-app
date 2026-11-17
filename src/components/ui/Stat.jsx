import { Icon } from './Icon';

/** A stat's content: its icon (when given), label, number and note - the same in a whole card and in each half of a split one. */
function StatBody({ icon, label, value, foot }) {
  return (
    <>
      {icon ? (
        <span className="si">
          <Icon name={icon} />
        </span>
      ) : null}
      <span className="l">{label}</span>
      <span className="v">{value}</span>
      <span className="f">{foot}</span>
    </>
  );
}

/** One half of a split stat: its own icon, label, number and note, a button when it leads somewhere. */
function StatHalf({ icon, color, label, value, foot, onClick, className = '' }) {
  // its own colour for the icon, when given (the side half differs from the card's)
  const style = color ? { '--sc': color } : undefined;
  const body = <StatBody icon={icon} label={label} value={value} foot={foot} />;
  return onClick ? (
    <button type="button" className={`stat-half ${className}`} style={style} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={`stat-half static ${className}`} style={style}>{body}</div>
  );
}

/**
 * One headline number in a `.card.stats` row; `index` places it in the row's stagger (`.stagger`).
 * With `side` ({ icon, label, value, foot, onClick }) the card splits in two, a thin line between: the main number
 * first, the side number after it (on the left in RTL); `bad` colours the main number only.
 */
export function Stat({ icon, color, label, value, foot, bad, onClick, index = 0, side = null }) {
  if (side) {
    return (
      <div className={`stat split${bad ? ' bad' : ''}`} style={{ '--sc': color, '--i': index }}>
        <StatHalf className="main" icon={icon} label={label} value={value} foot={foot} onClick={onClick} />
        <span className="stat-divider" aria-hidden="true" />
        <StatHalf className="side" {...side} />
      </div>
    );
  }

  const body = <StatBody icon={icon} label={label} value={value} foot={foot} />;
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

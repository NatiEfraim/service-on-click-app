import { Icon } from './Icon';

/** One headline number in a `.card.stats` row. */
export function Stat({ icon, color, label, value, foot, bad, onClick }) {
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
  const style = { '--sc': color };
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

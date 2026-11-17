'use client';

/**
 * The pictures of the permissions window's three main categories, drawn inline so their parts can move. All three in one
 * style: a container that opens and something that springs out of it - a toolbox (תחומי שירות), a safe (ביטחון מידע), a
 * network (תקשוב). Hover (a real pointer) gives a taste; opening the category plays the whole sequence;
 * closing reverses it. In the style of the site's other pictures: soft fills with a dark outline. Motion: people.css (.svc-*).
 */
const STROKE = { stroke: '#26232B', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

/** A gear: teeth around a disc with a hub. */
function Gear({ r, teethCount, toothW, toothH, fill, hub, className }) {
  return (
    <g className={className}>
      <g fill={fill} {...STROKE}>
        {Array.from({ length: teethCount }, (_, i) => (
          <rect key={i} x={-toothW / 2} y={-r - toothH + 1} width={toothW} height={toothH} rx={0.8} transform={`rotate(${(360 / teethCount) * i})`} />
        ))}
      </g>
      <circle r={r} fill={fill} {...STROKE} />
      <circle r={r * 0.38} fill={hub} {...STROKE} />
    </g>
  );
}

/** תחומי שירות - a toolbox: the lid swings open and a gear springs out of the box, turning. */
function ToolboxIcon() {
  return (
    <svg className="svc svc-box" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      <g transform="translate(16 15)"><Gear className="svc-g5-gear" r={5} teethCount={7} toothW={2.6} toothH={2.4} fill="#F2C46D" hub="#FFF3D1" /></g>
      <rect x="4" y="15" width="24" height="13" rx="2.5" fill="#E8826A" {...STROKE} />
      <path d="M13 21 H19" {...STROKE} />
      <g className="svc-g5-lid">
        <path d="M3.5 15 H28.5 L27 11.5 H5 Z" fill="#C9675A" {...STROKE} />
        <path d="M12.5 11.5 V9.5 a1.5 1.5 0 0 1 1.5 -1.5 H18 a1.5 1.5 0 0 1 1.5 1.5 V11.5" fill="none" {...STROKE} />
      </g>
    </svg>
  );
}

/** ביטחון מידע - a safe: hover opens the door a crack (a gold glow inside); opening swings it wide and a gold shield springs out. */
function SafeIcon() {
  return (
    <svg className="svc svc-safe" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      <rect x="4" y="5.5" width="24" height="21" rx="3" fill="#8FB3E8" {...STROKE} />
      <rect x="7" y="8.5" width="18" height="15" rx="1.5" fill="#2C3E66" {...STROKE} />
      <circle className="svc-sf-glow" cx="16" cy="16" r="6.5" fill="#F2C14E" opacity="0" />
      <path className="svc-sf-item" d="M16 11 L20.5 12.8 V16 C20.5 18.8 18.6 20.8 16 22 C13.4 20.8 11.5 18.8 11.5 16 V12.8 Z" fill="#F2C14E" {...STROKE} />
      <g className="svc-sf-door">
        <rect x="7" y="8.5" width="18" height="15" rx="1.5" fill="#C7D8F2" {...STROKE} />
        <circle className="svc-sf-dial" cx="16" cy="16" r="3.4" fill="#FFFFFF" {...STROKE} />
        <path className="svc-sf-dial" d="M16 12.6 V14.2 M16 17.8 V19.4 M12.6 16 H14.2 M17.8 16 H19.4" {...STROKE} />
      </g>
      <path d="M7 26.5 V28.5 M25 26.5 V28.5" {...STROKE} />
    </svg>
  );
}

/** תקשוב - a network: hover starts drawing its links; opening jumps the nodes out from the hub to its edges as the links draw. */
function NetworkIcon() {
  const node = (cls, cx, cy, fill) => <circle className={`svc-i5-node ${cls}`} cx={cx} cy={cy} r="3.2" fill={fill} {...STROKE} />;
  return (
    <svg className="svc svc-i5" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      <g stroke="#26232B" strokeWidth="1.5" strokeLinecap="round">
        <path className="svc-i5-link" d="M15 18 L6 9" pathLength="100" />
        <path className="svc-i5-link" d="M15 18 L6 27" pathLength="100" />
        <path className="svc-i5-link" d="M15 18 L26 26" pathLength="100" />
      </g>
      {node('n1', 6, 9, '#F2C46D')}
      {node('n2', 6, 27, '#8CC79A')}
      {node('n3', 26, 26, '#E8826A')}
      <circle cx="15" cy="18" r="4.2" fill="#3E5C8A" {...STROKE} />
      <circle cx="15" cy="18" r="1.5" fill="#9ED3F0" />
    </svg>
  );
}

/** The picture of each main category (by its id in PermissionsCards). */
export const CATEGORY_ICONS = { service: ToolboxIcon, infosec: SafeIcon, ict: NetworkIcon };

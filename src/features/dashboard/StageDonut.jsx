'use client';

import { useChartTooltip } from '@/components/ui/ChartTooltip';
import { EmptyState } from '@/components/ui/Feedback';
import { STAGE_COLOR } from '@/lib/labels';
import { CHART_STAGE_ORDER, chartStageLabel } from './constants';
import { useSession } from '@/providers/SessionProvider';

const SIZE = 200;
const OUTER = 96;
const INNER = 58;
/** A thin white gap between slices (as in the reference doughnut). */
const GAP = 2;

/** The SVG path of one ring slice from angle a0 to a1 (radians, 0 = top, clockwise). */
function slicePath(a0, a1) {
  const c = SIZE / 2;
  const point = (r, a) => `${c + r * Math.sin(a)} ${c - r * Math.cos(a)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${point(OUTER, a0)} A ${OUTER} ${OUTER} 0 ${large} 1 ${point(OUTER, a1)} L ${point(INNER, a1)} A ${INNER} ${INNER} 0 ${large} 0 ${point(INNER, a0)} Z`;
}

/** One domain's open bookings as a doughnut, a slice per stage in the stage colours; a slice (or legend entry) opens those bookings. */
export function StageDonut({ stages, bookingTypeId, onPick }) {
  const { typeName } = useSession();
  const tip = useChartTooltip();
  const rows = CHART_STAGE_ORDER.filter((id) => stages[id] > 0).map((id) => ({ id, count: stages[id] }));
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  if (!total) return <EmptyState title="אין קריאות פתוחות בתחום זה" />;

  let angle = 0;
  const slices = rows.map((row) => {
    const start = angle;
    angle += (row.count / total) * Math.PI * 2;
    return { ...row, start, end: angle };
  });
  const sliceProps = (slice) => ({
    className: 'donut-slice',
    tabIndex: 0,
    role: 'button',
    'aria-label': `${chartStageLabel(slice.id, bookingTypeId)}: ${slice.count} קריאות`,
    onClick: () => onPick(slice.id),
    onKeyDown: (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onPick(slice.id);
      }
    },
    ...tip.bind({
      color: STAGE_COLOR[slice.id],
      title: chartStageLabel(slice.id, bookingTypeId),
      value: slice.count,
      unit: 'קריאות',
      sub: `${typeName(bookingTypeId)} · ${Math.round((slice.count / total) * 100)}% מהפתוחות · לחיצה פותחת אותן`,
    }),
  });

  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox={`0 0 ${SIZE} ${SIZE}`} role="group" aria-label={`${typeName(bookingTypeId)}: קריאות פתוחות לפי שלב`}>
        {slices.length === 1 ? (
          // a full ring cannot be drawn as one arc
          <circle cx={SIZE / 2} cy={SIZE / 2} r={(OUTER + INNER) / 2} fill="none" stroke={STAGE_COLOR[slices[0].id]} strokeWidth={OUTER - INNER} {...sliceProps(slices[0])} />
        ) : (
          slices.map((slice) => (
            <path key={slice.id} d={slicePath(slice.start, slice.end)} fill={STAGE_COLOR[slice.id]} stroke="var(--surface)" strokeWidth={GAP} {...sliceProps(slice)} />
          ))
        )}
        <text x={SIZE / 2} y={SIZE / 2 - 4} textAnchor="middle" className="donut-total">{total}</text>
        <text x={SIZE / 2} y={SIZE / 2 + 18} textAnchor="middle" className="donut-cap">פתוחות</text>
      </svg>
      {tip.node}
    </div>
  );
}

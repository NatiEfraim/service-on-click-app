import type { CSSProperties } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { StageAnalysis, StageId, TrendPoint } from '@/lib/api/types';
import { fmtDate, fmtHours } from '@/lib/format';
import { STAGE_COLOR, STAGE_ORDER, STAGE_SHORT } from '@/lib/labels';

const ALWAYS_SHOWN: StageId[] = ['vice_approver', 'approver', 'realization'];

/** Stage pipeline: open bookings per stage, coloured by severity against the handling target. */
export function Pipeline({ byStage, analysis, onStage }: { byStage: Partial<Record<StageId, number>>; analysis: Record<string, StageAnalysis>; onStage: (stage: StageId) => void }) {
  const stages = STAGE_ORDER.filter((id) => byStage[id] || ALWAYS_SHOWN.includes(id));
  return (
    <div className="pipe">
      {stages.map((id) => {
        const info = analysis[id];
        return (
          <button key={id} type="button" className={`cell ${info?.severity ?? ''}`} style={{ '--c': STAGE_COLOR[id] } as CSSProperties} title="הצגת הקריאות בשלב" onClick={() => onStage(id)}>
            <span className="s">
              <i className="sdot" />
              {STAGE_SHORT[id]}
            </span>
            <span className="n">{byStage[id] ?? 0}</span>
            <span className="m">
              {info?.median_hours != null ? `חציון ${fmtHours(info.median_hours)}` : ' '}
              {info?.breached_open ? ` · ${info.breached_open} חורגות` : ''}
            </span>
            <span className="arrow">
              <Icon name="left" />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Opened vs closed per day, as plain SVG (left to right = oldest to newest). */
export function TrendChart({ points, width = 1200, height = 190 }: { points: TrendPoint[]; width?: number; height?: number }) {
  if (points.length < 2) return <div className="muted">אין מספיק נתונים להצגת מגמה.</div>;

  const max = Math.max(1, ...points.flatMap((p) => [p.opened, p.closed]));
  const x = (i: number) => 26 + (i * (width - 34)) / (points.length - 1);
  const y = (v: number) => height - 20 - (v * (height - 32)) / max;
  const line = (key: 'opened' | 'closed') => points.map((p, i) => `${x(i)},${y(p[key])}`).join(' ');

  return (
    <>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="נפתחו מול נסגרו" style={{ direction: 'ltr' }}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={26} x2={width - 8} y1={y(max * f)} y2={y(max * f)} stroke="var(--line-2)" />
            <text x={2} y={y(max * f) + 4}>
              {Math.round(max * f)}
            </text>
          </g>
        ))}
        <polyline points={line('opened')} fill="none" style={{ stroke: 'var(--chart-a)' }} strokeWidth={2} />
        <polyline points={line('closed')} fill="none" style={{ stroke: 'var(--chart-b)' }} strokeWidth={2.4} />
        {[0, points.length - 1].map((i) => (
          <text key={i} x={x(i)} y={height - 3} textAnchor={i ? 'end' : 'start'}>
            {fmtDate(points[i].day)}
          </text>
        ))}
      </svg>
      <div className="legend" style={{ padding: '6px 0 0' }}>
        <span>
          <i style={{ background: 'var(--chart-a)' }} />
          נפתחו
        </span>
        <span>
          <i style={{ background: 'var(--chart-b)' }} />
          נסגרו
        </span>
      </div>
    </>
  );
}

export function indexStages(stages: StageAnalysis[]): Record<string, StageAnalysis> {
  return Object.fromEntries(stages.map((stage) => [stage.stage, stage]));
}

/** The stage where over-target bookings pile up (worst first), or null. */
export function worstStage(stages: StageAnalysis[]): StageAnalysis | null {
  return stages.find((s) => s.severity === 'critical') ?? stages.find((s) => s.severity === 'warning') ?? null;
}

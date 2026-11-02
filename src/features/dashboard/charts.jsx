'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

import { fmtDate, fmtHours } from '@/lib/format';
import { STAGE_COLOR, STAGE_SHORT } from '@/lib/labels';
import { FOLDED_INTO, PIPELINE_STAGES } from './constants';


/** Stage pipeline: open bookings per stage, coloured by severity against the handling target. */
export function Pipeline({ byStage: raw, analysis, onStage }) {
  const stages = PIPELINE_STAGES;
  const byStage = { ...raw };
  for (const [from, to] of Object.entries(FOLDED_INTO)) {
    if (raw[from]) byStage[to] = (byStage[to] ?? 0) + (raw[from] ?? 0);
  }
  return (
    <div className="pipe">
      {stages.map((id) => {
        const info = analysis[id];
        return (
          <button key={id} type="button" className={`cell ${info?.severity ?? ''}`} style={{ '--c': STAGE_COLOR[id] }} title="הצגת הקריאות בשלב" onClick={() => onStage(id)}>
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
/** A round axis maximum (1, 2, 5 x 10^n) so the tick labels are whole, readable numbers. */
function niceMax(value) {
  const power = 10 ** Math.floor(Math.log10(Math.max(1, value)));
  return ([1, 2, 2.5, 5, 10].map((step) => step * power).find((candidate) => candidate >= value) ?? 10 * power);
}

/** Opened vs closed per day, drawn at the container's real width so the text stays full size; hover reads out a day. */
export function TrendChart({ points, height = 260 }) {
  const box = useRef(null);
  const [width, setWidth] = useState(600);
  const [hover, setHover] = useState(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(280, el.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (points.length < 2) return <div className="muted">אין מספיק נתונים להצגת מגמה.</div>;

  const pad = { left: 44, right: 12, top: 12, bottom: 28 };
  const max = niceMax(Math.max(...points.flatMap((p) => [p.opened, p.closed])));
  const x = (i) => pad.left + (i * (width - pad.left - pad.right)) / (points.length - 1);
  const y = (v) => height - pad.bottom - (v * (height - pad.top - pad.bottom)) / max;
  const line = (key) => points.map((p, i) => `${x(i)},${y(p[key])}`).join(' ');
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const xCount = Math.min(points.length, Math.max(2, Math.floor(width / 110)));
  const xTicks = Array.from({ length: xCount }, (_, k) => Math.round((k * (points.length - 1)) / (xCount - 1)));

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const i = Math.round(((px - pad.left) / (width - pad.left - pad.right)) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };
  const shown = hover === null ? null : points[hover];

  return (
    <>
      <div ref={box} className="trend-box">
        <svg className="chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="נפתחו מול נסגרו לפי יום" style={{ direction: 'ltr' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--line-2)" />
              <text x={pad.left - 8} y={y(tick) + 4} textAnchor="end">
                {tick}
              </text>
            </g>
          ))}
          {xTicks.map((i) => (
            <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>
              {fmtDate(points[i].day)}
            </text>
          ))}
          <polyline points={line('opened')} fill="none" style={{ stroke: 'var(--chart-a)' }} strokeWidth={2} strokeLinejoin="round" />
          <polyline points={line('closed')} fill="none" style={{ stroke: 'var(--chart-b)' }} strokeWidth={2} strokeLinejoin="round" />
          {shown && hover !== null ? (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={height - pad.bottom} stroke="var(--mute)" strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(shown.opened)} r={4.5} style={{ fill: 'var(--chart-a)' }} stroke="var(--surface)" strokeWidth={2} />
              <circle cx={x(hover)} cy={y(shown.closed)} r={4.5} style={{ fill: 'var(--chart-b)' }} stroke="var(--surface)" strokeWidth={2} />
            </g>
          ) : null}
        </svg>
        {shown && hover !== null ? (
          <div className="trend-tip" style={{ left: Math.min(width - 150, Math.max(0, x(hover) + 12)) }}>
            <b>{fmtDate(shown.day)}</b>
            <span>
              <i style={{ background: 'var(--chart-a)' }} />
              נפתחו: {shown.opened}
            </span>
            <span>
              <i style={{ background: 'var(--chart-b)' }} />
              נסגרו: {shown.closed}
            </span>
          </div>
        ) : null}
      </div>
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

export function indexStages(stages) {
  return Object.fromEntries(stages.map((stage) => [stage.stage, stage]));
}

/** The stage where over-target bookings pile up (worst first), or null. */
export function worstStage(stages) {
  return stages.find((s) => s.severity === 'critical') ?? stages.find((s) => s.severity === 'warning') ?? null;
}

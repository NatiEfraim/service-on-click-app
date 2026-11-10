'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DomainIcon } from '@/components/booking/DomainBadge';
import { EmptyState } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { useChartTooltip } from '@/components/ui/ChartTooltip';

import { STAGE_COLOR, STAGE_ORDER, STAGE_SHORT } from '@/lib/labels';
import { workflowColumns } from './constants';
import { useSession } from '@/providers/SessionProvider';

/** A bar per domain, split by the stage its open bookings are in (longest first); a segment opens those bookings. */
export function StageBars({ byTypeStage, onlyTypes, onPickType, pickedType }) {
  const router = useRouter();
  const { typeName } = useSession();
  const [chartType, setChartType] = useState(null);
  const tip = useChartTooltip();

  const rows = Object.entries(byTypeStage)
    .map(([type, stages]) => ({ type: Number(type), stages, total: Object.values(stages).reduce((sum, n) => sum + (n ?? 0), 0) }))
    .filter((row) => row.total > 0 && (!onlyTypes || onlyTypes.includes(row.type)))
    .sort((a, b) => b.total - a.total);
  const widest = Math.max(1, ...rows.map((row) => row.total));
  const usedStages = STAGE_ORDER.filter((id) => rows.some((row) => row.stages[id]));

  const chartRow = rows.find((row) => row.type === chartType);

  if (rows.length === 0) return <EmptyState title="אין קריאות פתוחות" />;

  return (
    <>
      <div style={{ padding: '8px 0' }}>
        {rows.map((row) => (
          <div className="hbar" key={row.type}>
            <button
              type="button"
              className={`lab${pickedType === row.type ? ' on' : ''}`}
              data-tip="הצגת גרף עמודות לפי שלב"
              aria-pressed={onPickType ? pickedType === row.type : undefined}
              onClick={() => (onPickType ? onPickType(row.type) : setChartType(row.type))}
            >
              <DomainIcon bookingTypeId={row.type} />
              {typeName(row.type)}
            </button>
            <span className="track" style={{ width: `${Math.max(8, (row.total / widest) * 100)}%` }}>
              {STAGE_ORDER.filter((id) => row.stages[id]).map((id) => (
                <button
                  key={id}
                  type="button"
                  style={{ flex: row.stages[id], background: STAGE_COLOR[id] }}
                  {...tip.bind({
                    color: STAGE_COLOR[id],
                    title: STAGE_SHORT[id],
                    value: row.stages[id],
                    unit: 'קריאות',
                    sub: `${typeName(row.type)} · ${Math.round((row.stages[id] / row.total) * 100)}% מהפתוחות · לחיצה פותחת אותן`,
                  })}
                  aria-label={`${typeName(row.type)} - ${STAGE_SHORT[id]}: ${row.stages[id]}`}
                  onClick={() => router.push(`/requests?view=open&types=${row.type}&stage=${id}`)}
                />
              ))}
            </span>
            <b className="num">{row.total}</b>
          </div>
        ))}
      </div>
      {tip.node}
      <div className="legend">
        {usedStages.map((id) => (
          <span key={id}>
            <i style={{ background: STAGE_COLOR[id] }} />
            {STAGE_SHORT[id]}
          </span>
        ))}
      </div>
      {chartRow ? (
        <Modal title={`${typeName(chartRow.type)}: ${chartRow.total} קריאות פתוחות לפי שלב`} onClose={() => setChartType(null)} wide>
          <StageColumns
            stages={chartRow.stages}
            bookingTypeId={chartRow.type}
            onPick={(id) => router.push(`/requests?view=open&types=${chartRow.type}&stage=${id}`)}
          />
        </Modal>
      ) : null}
    </>
  );
}

/** A column per stage with its count above it; a column opens those bookings. */
export function StageColumns({ stages, onPick, bookingTypeId }) {
  const { catalog } = useSession();
  // only the stages of this domain's workflow (the barber has one, a shipment has the control officer and the suppliers);
  // a stage that still holds bookings always shows, so nothing open is hidden
  const shown = workflowColumns(bookingTypeId, catalog, stages, STAGE_ORDER);
  const tallest = Math.max(1, ...shown.map((id) => stages[id] ?? 0));

  return (
    <div className="vbars">
      {shown.map((id) => {
        const count = stages[id] ?? 0;
        return (
          <button
            key={id}
            type="button"
            className="vbar"
            disabled={count === 0}
            aria-label={`${STAGE_SHORT[id]}: ${count}`}
            onClick={() => onPick(id)}
          >
            <b className="num">{count}</b>
            <span className="col" style={{ height: `${(count / tallest) * 100}%`, background: STAGE_COLOR[id] }} />
            <span className="lab">{STAGE_SHORT[id]}</span>
          </button>
        );
      })}
    </div>
  );
}

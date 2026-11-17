'use client';

import { useMutation } from '@tanstack/react-query';
import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Seg } from '@/components/ui/Controls';
import { Notice } from '@/components/ui/Feedback';
import { ApiError } from '@/lib/api/client';
import { EASE_OUT, prefersReducedMotion } from '@/lib/motion';

/** The two ways a hatch operation runs (the API's `channel`): the full path through the FTP, or the bucket only. */
const CHANNELS = [
  { value: 'ftp', label: 'דרך ה-FTP' },
  { value: 'bucket', label: 'ישירות ל-bucket' },
];

/** Line tones to notice tones: errors red, warnings yellow, the rest (results and soft notices) plain. */
const NOTICE_TONE = { bad: 'bad', warn: 'warn', ok: '', info: '' };

/**
 * One operation: its channel (through the FTP or straight to the bucket), an optional force box and filters, its button,
 * and the last result (kept until the next press). Each card has its own request, so pressing one never blocks the others.
 * `ftpOnlyFilters`: the filters apply to the FTP channel only (they are switched off and not sent on the bucket one).
 * `next(data)`: an extra line after a result (e.g. the import order's next step), or null.
 */
export function HatchCard({ title, hint, button, run, read, withForce = true, children, filters = {}, ftpOnlyFilters = false, next, forceLabel = 'שליחה בכפייה' }) {
  const [force, setForce] = useState(false);
  const [channel, setChannel] = useState('ftp');
  // force matters on the FTP channel only (the bucket channel ignores it)
  const forceApplies = withForce && channel === 'ftp';
  const filtersApply = !ftpOnlyFilters || channel === 'ftp';
  // the last answer stays on screen (dimmed) while the next press runs, so the card does not jump empty and back;
  // `seq` gives each answer its own key, so a new one fades in
  const [shown, setShown] = useState(null);
  const mutation = useMutation({
    mutationFn: () => run({ channel, ...(filtersApply ? filters : {}), ...(forceApplies ? { force: force ? 1 : 0 } : {}) }),
    onSuccess: (data) => {
      const extra = next?.(data);
      setShown((prev) => ({ seq: (prev?.seq ?? 0) + 1, lines: [...read(data), ...(extra ? [extra] : [])], failure: null }));
    },
    onError: (error) => setShown((prev) => ({ seq: (prev?.seq ?? 0) + 1, lines: [], failure: error instanceof ApiError ? error.message : 'הפעולה נכשלה. נסו שוב.' })),
  });

  // each new answer: the area glides from the height it had (0 the first time) to the new one while the answer fades in
  const resultBox = useRef(null);
  const lastHeight = useRef(0);
  useLayoutEffect(() => {
    const box = resultBox.current;
    if (!box || !shown) return;
    const to = box.scrollHeight;
    const from = lastHeight.current;
    lastHeight.current = to;
    if (prefersReducedMotion()) return;
    // the same height (a repeated answer) needs no glide, but the new answer still fades in
    const glide = Math.abs(to - from) < 1 ? null : box.animate([{ height: `${from}px`, overflow: 'hidden' }, { height: `${to}px`, overflow: 'hidden' }], { duration: 320, easing: EASE_OUT });
    const fade = box.firstElementChild?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, delay: 80, easing: EASE_OUT, fill: 'backwards' });
    return () => {
      glide?.cancel();
      fade?.cancel();
    };
  }, [shown]);

  return (
    <Card title={title} hint={hint}>
      <CardBody>
        <Seg label={`מסלול: ${title}`} options={CHANNELS} value={channel} onChange={setChannel} />
        <div className="hatch-form">
          {children ? (
            <fieldset className="hatch-filters" disabled={!filtersApply} data-tip={filtersApply ? undefined : 'הסינון חל רק במסלול דרך ה-FTP'}>
              {children}
            </fieldset>
          ) : null}
          {withForce ? (
            <label className="check" data-tip={forceApplies ? undefined : 'במסלול ישירות ל-bucket אין לכך משמעות'}>
              <input type="checkbox" checked={force} disabled={mutation.isPending || !forceApplies} onChange={(event) => setForce(event.target.checked)} />
              {forceLabel}
            </label>
          ) : null}
          <Button variant="primary" loading={mutation.isPending} onClick={() => mutation.mutate()}>
            {button}
          </Button>
        </div>
        {/* the card's height glides to fit the result instead of jumping */}
        <div ref={resultBox}>
          {shown ? (
            <div key={shown.seq} className="hatch-result" aria-live="polite" data-busy={mutation.isPending || undefined}>
              {shown.failure ? <Notice tone="bad">{shown.failure}</Notice> : null}
              {shown.lines.map((line, i) => (
                <Notice key={i} tone={NOTICE_TONE[line.tone]}>
                  {line.text}
                </Notice>
              ))}
            </div>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}

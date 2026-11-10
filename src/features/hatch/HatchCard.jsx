'use client';

import { useMutation } from '@tanstack/react-query';
import { useLayoutEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Feedback';
import { ApiError } from '@/lib/api/client';
import { EASE_OUT, prefersReducedMotion } from '@/lib/motion';

/** Line tones to notice tones: errors red, warnings yellow, the rest (results and soft notices) plain. */
const NOTICE_TONE = { bad: 'bad', warn: 'warn', ok: '', info: '' };

/**
 * One operation: its button, an optional force box and filters, and the last result (kept until the next press).
 * Each card has its own request, so pressing one never blocks the others.
 */
export function HatchCard({ title, hint, button, run, read, withForce = true, children, filters = {} }) {
  const [force, setForce] = useState(false);
  // the last answer stays on screen (dimmed) while the next press runs, so the card does not jump empty and back;
  // `seq` gives each answer its own key, so a new one fades in
  const [shown, setShown] = useState(null);
  const mutation = useMutation({
    mutationFn: () => run({ ...filters, ...(withForce ? { force: force ? 1 : 0 } : {}) }),
    onSuccess: (data) => setShown((prev) => ({ seq: (prev?.seq ?? 0) + 1, lines: read(data), failure: null })),
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
        <div className="hatch-form">
          {children}
          {withForce ? (
            <label className="check">
              <input type="checkbox" checked={force} disabled={mutation.isPending} onChange={(event) => setForce(event.target.checked)} />
              שליחה בכפייה
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

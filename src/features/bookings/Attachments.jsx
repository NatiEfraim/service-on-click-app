'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useOverlay } from '@/components/ui/overlay';
import { useIsClient } from '@/components/ui/useIsClient';


const isPdf = (attachment) => (attachment.mime ?? '').toLowerCase() === 'application/pdf' || attachment.name.toLowerCase().endsWith('.pdf');

/** Full-screen viewer for images and PDFs; arrow keys are mirrored in RTL (right = previous). */
function LightboxInner({ items, start, onClose }) {
  const [index, setIndex] = useState(start);
  const ref = useRef(null);
  useOverlay(ref, { onEscape: onClose });

  const many = items.length > 1;
  const go = (step) => setIndex((current) => (current + step + items.length) % items.length);

  useEffect(() => {
    if (!many) return;
    const onKey = (event) => {
      if (event.key === 'ArrowLeft') go(1);
      if (event.key === 'ArrowRight') go(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go() depends only on items.length
  }, [many, items.length]);

  const item = items[index];
  if (!item?.url) return null;

  return (
    <div ref={ref} className="lightbox" role="dialog" aria-modal="true" aria-label={item.name}>
      <div className="lb-top">
        <span>
          {item.name}
          {many ? ` · ${index + 1} מתוך ${items.length}` : ''}
        </span>
        <Button size="sm" onClick={onClose} aria-label="סגירה">
          <Icon name="x" />
          סגירה
        </Button>
      </div>
      <div
        className="lb-stage"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        {many ? (
          <button type="button" className="lb-nav" aria-label="הקודם" onClick={() => go(-1)}>
            <Icon name="right" />
          </button>
        ) : null}
        {isPdf(item) ? (
          <iframe key={item.url} src={item.url} title={item.name} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- needs the login cookie, so not next/image
          <img key={item.url} src={item.url} alt={item.name} />
        )}
        {many ? (
          <button type="button" className="lb-nav" aria-label="הבא" onClick={() => go(1)}>
            <Icon name="left" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function Lightbox(props) {
  const isClient = useIsClient();
  if (!isClient) return null;
  return createPortal(<LightboxInner {...props} />, document.body);
}

/** The booking's files: images open in the viewer, other documents download. */
export function AttachmentsPanel({ attachments }) {
  const viewable = attachments.filter((attachment) => attachment.available && attachment.inline && attachment.url);
  const [open, setOpen] = useState(null);

  return (
    <section className="panel">
      <header>
        <h2>קבצים ותמונות</h2>
        <span className="hint">{attachments.length}</span>
      </header>
      <div className="body">
        <div className="thumbs">
          {attachments.map((attachment) => {
            const key = `${attachment.kind}-${attachment.id}`;

            if (!attachment.available || !attachment.url) {
              return (
                <span key={key} className="thumb missing" title="הקובץ טרם התקבל מהאפליקציה">
                  <span className="ph">
                    <Icon name={attachment.kind === 'image' ? 'image' : 'file'} />
                  </span>
                  <span className="nm">{attachment.name} · טרם התקבל</span>
                </span>
              );
            }

            if (!attachment.inline) {
              return (
                <a key={key} className="thumb" href={attachment.url} download={attachment.name} aria-label={`הורדת ${attachment.name}`}>
                  <span className="ph">
                    <Icon name="download" />
                  </span>
                  <span className="nm">
                    <Icon name="file" />
                    {attachment.name}
                  </span>
                </a>
              );
            }

            const position = viewable.findIndex((item) => item.kind === attachment.kind && item.id === attachment.id);
            return (
              <button key={key} type="button" className="thumb" aria-label={`פתיחת ${attachment.name}`} onClick={() => setOpen(position)}>
                {isPdf(attachment) ? (
                  <span className="ph">
                    <Icon name="file" />
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachment.url} alt="" loading="lazy" />
                )}
                <span className="nm">
                  <Icon name={attachment.kind === 'image' ? 'image' : 'file'} />
                  {attachment.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {open !== null ? <Lightbox items={viewable} start={open} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

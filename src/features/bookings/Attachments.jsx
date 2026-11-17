'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useOverlay } from '@/components/ui/overlay';
import { useIsClient } from '@/components/ui/useIsClient';
import { downloadBlob } from '@/lib/export/download';
import { fetchCookieless, needsCookieless, useCookielessFile } from './cookielessFile';

/** One file in the viewer, from its cookie-less copy (cookielessFile): a PDF in a frame, an image as itself. */
function ViewerMedia({ item }) {
  const { src, failed } = useCookielessFile(item.url);
  if (failed) return <p className="lb-msg">לא ניתן להציג את הקובץ. נסו לסגור ולפתוח שוב.</p>;
  if (!src) return <p className="lb-msg">טוען…</p>;
  return isPdf(item) ? (
    <iframe key={item.url} src={src} title={item.label ?? item.name} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- an object URL, not a static image
    <img key={item.url} src={src} alt={item.label ?? item.name} />
  );
}

/** A thumbnail's picture from its cookie-less copy; the type's glyph until it is in memory, or when it cannot be fetched. */
function ThumbImage({ attachment }) {
  const { src } = useCookielessFile(attachment.url);
  if (!src) return <FileGlyph attachment={attachment} />;
  // eslint-disable-next-line @next/next/no-img-element -- an object URL, not a static image
  return <img src={src} alt="" />;
}

/** Saves a non-viewable attachment from its cookie-less copy (a plain link would carry the app's cookies to the store). */
async function downloadAttachment(attachment) {
  // on another host: open the direct address (one request)
  if (!needsCookieless(attachment.url)) {
    window.open(attachment.url, '_blank', 'noopener');
    return;
  }
  let src;
  try {
    src = await fetchCookieless(attachment.url);
  } catch {
    // the store does not allow reading it from code (CORS): open the direct address instead
    window.open(attachment.url, '_blank', 'noopener');
    return;
  }
  const blob = await (await fetch(src)).blob();
  downloadBlob(blob, attachment.label ?? attachment.name ?? 'קובץ');
}


/** A stored identifier rather than a real name: a uuid (or long hex), with or without an extension. */
const STORED_NAME = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}(\.[a-z0-9]+)?$|^[0-9a-f]{24,}(\.[a-z0-9]+)?$/i;

/**
 * The name to show for an attachment: its own when it is a real name; a readable label ("תמונה 2", "קובץ 3") when the
 * server sent only a stored identifier (web uploads, until the API returns the original name). `number` is 1-based.
 */
export function attachmentLabel(attachment, number) {
  const name = (attachment.name ?? '').trim();
  if (name && !STORED_NAME.test(name)) return name;
  return `${attachment.kind === 'image' ? 'תמונה' : isPdf(attachment) ? 'מסמך PDF' : 'קובץ'} ${number}`;
}

const isPdf = (attachment) => (attachment.mime ?? '').toLowerCase() === 'application/pdf' || (attachment.name ?? '').toLowerCase().endsWith('.pdf');

/**
 * An attachment's type for its tile: the badge text and its family. The families are what the apps accept (PDF, DOCX,
 * XLSX, PPTX and PNG/JPG/JPEG, plus GIF/WEBP from the website); anything else is "other".
 */
function fileType(attachment) {
  const name = (attachment.name ?? attachment.url ?? '').split('?')[0].toLowerCase();
  const mime = (attachment.mime ?? '').toLowerCase();
  const ext = isPdf(attachment) ? 'pdf' : (name.match(/\.([a-z0-9]{2,4})$/)?.[1] ?? '');
  let tone = 'other';
  if (ext === 'pdf') tone = 'pdf';
  else if (/^(docx?|rtf|odt)$/.test(ext) || mime.includes('word')) tone = 'doc';
  else if (/^(xlsx?|csv|ods)$/.test(ext) || mime.includes('sheet') || mime.includes('excel')) tone = 'xls';
  else if (/^(pptx?|odp)$/.test(ext) || mime.includes('presentation') || mime.includes('powerpoint')) tone = 'ppt';
  else if (/^(png|jpe?g|gif|webp|heic|bmp)$/.test(ext) || mime.startsWith('image/') || attachment.kind === 'image') tone = 'img';
  return { ext: ext ? ext.toUpperCase() : tone === 'img' ? 'IMG' : 'קובץ', tone };
}

/** Each family's mark on the page (a 30×26 drawing in the page's middle). */
const FILE_MARKS = {
  // a page of text with a heading
  pdf: (
    <>
      <rect x="3" y="3" width="15" height="3" rx="1.5" className="fg-ink" />
      <rect x="3" y="10" width="24" height="2" rx="1" />
      <rect x="3" y="15" width="24" height="2" rx="1" />
      <rect x="3" y="20" width="16" height="2" rx="1" />
    </>
  ),
  // paragraphs: a title and justified lines
  doc: (
    <>
      <rect x="3" y="3" width="24" height="3" rx="1.5" className="fg-ink" />
      <rect x="3" y="9" width="24" height="2" rx="1" />
      <rect x="3" y="13" width="24" height="2" rx="1" />
      <rect x="3" y="17" width="24" height="2" rx="1" />
      <rect x="3" y="21" width="13" height="2" rx="1" />
    </>
  ),
  // a sheet: a header row and a grid
  xls: (
    <>
      <rect x="2" y="2" width="26" height="22" rx="2" className="fg-frame" />
      <rect x="2" y="2" width="26" height="6" rx="2" className="fg-ink" />
      <path d="M11 2v22M20 2v22M2 13h26M2 18.5h26" className="fg-grid" />
    </>
  ),
  // a slide with a small bar chart
  ppt: (
    <>
      <rect x="2" y="3" width="26" height="18" rx="2" className="fg-frame" />
      <rect x="7" y="12" width="4" height="6" rx="1" className="fg-ink" />
      <rect x="13" y="8" width="4" height="10" rx="1" className="fg-ink" />
      <rect x="19" y="10" width="4" height="8" rx="1" />
      <rect x="13" y="22" width="4" height="3" rx="1" />
    </>
  ),
  // a photo: a sun over hills
  img: (
    <>
      <rect x="2" y="2" width="26" height="22" rx="3" className="fg-frame" />
      <circle cx="21" cy="8.5" r="3" className="fg-ink" />
      <path d="M2 21l8-8 6 6 4-4 8 8v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" className="fg-ink" />
    </>
  ),
  // anything else: a few plain lines
  other: (
    <>
      <rect x="3" y="6" width="24" height="2" rx="1" />
      <rect x="3" y="11" width="24" height="2" rx="1" />
      <rect x="3" y="16" width="16" height="2" rx="1" />
    </>
  ),
};

/**
 * An attachment drawn by its type: a page with a folded corner, the type's mark and a coloured badge (PDF, DOCX,
 * XLSX, PPTX, JPG…). `download` adds a download dot; an image whose picture is not in memory yet shows it too.
 */
function FileGlyph({ attachment, download = false }) {
  const { ext, tone } = fileType(attachment);
  return (
    <span className={`ph file-glyph tone-${tone}`} aria-hidden="true">
      <span className="fg-page">
        <svg className="fg-mark" viewBox="0 0 30 26">
          {FILE_MARKS[tone]}
        </svg>
        <span className="fg-badge">{ext}</span>
      </span>
      {download ? (
        <span className="fg-dl">
          <Icon name="download" />
        </span>
      ) : null}
    </span>
  );
}

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
    <div ref={ref} className="lightbox" role="dialog" aria-modal="true" aria-label={item.label ?? item.name}>
      <div className="lb-top">
        <span className="lb-title">
          <span className="lb-name">{item.label ?? item.name}</span>
          {/* the counter apart, isolated: a Latin file name beside it cannot reorder it */}
          {many ? <bdi className="lb-count">{index + 1} מתוך {items.length}</bdi> : null}
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
          <button type="button" className="lb-nav lb-prev" aria-label="הקודם" onClick={() => go(-1)}>
            <Icon name="right" />
          </button>
        ) : null}
        <ViewerMedia key={item.url} item={item} />
        {many ? (
          <button type="button" className="lb-nav lb-next" aria-label="הבא" onClick={() => go(1)}>
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

const hasDownload = (attachment) => attachment.available && Boolean(attachment.url?.trim());

/** The booking's files: images and PDFs open in the viewer, other documents download. */
export function AttachmentsPanel({ attachments: given }) {
  // readable names, numbered in the panel's order (a stored identifier is not a name to show)
  const attachments = given.map((attachment, index) => ({ ...attachment, label: attachmentLabel(attachment, index + 1) }));
  const viewable = attachments.filter((attachment) => hasDownload(attachment) && attachment.inline);
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

            if (!hasDownload(attachment)) {
              return (
                <span key={key} className="thumb missing" data-tip="הקובץ טרם התקבל מהאפליקציה">
                  <FileGlyph attachment={attachment} />
                  <span className="nm">{attachment.label} · טרם התקבל</span>
                </span>
              );
            }

            if (!attachment.inline) {
              return (
                <button key={key} type="button" className="thumb" aria-label={`הורדת ${attachment.label}`} onClick={() => void downloadAttachment(attachment).catch(() => {})}>
                  <FileGlyph attachment={attachment} download />
                  <span className="nm">
                    <Icon name="file" />
                    {attachment.label}
                  </span>
                </button>
              );
            }

            const position = viewable.findIndex((item) => item.kind === attachment.kind && item.id === attachment.id);
            return (
              <button key={key} type="button" className="thumb" aria-label={`פתיחת ${attachment.label}`} onClick={() => setOpen(position)}>
                {isPdf(attachment) ? (
                  <FileGlyph attachment={attachment} />
                ) : (
                  <ThumbImage attachment={attachment} />
                )}
                <span className="nm">
                  <Icon name={attachment.kind === 'image' ? 'image' : 'file'} />
                  {attachment.label}
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

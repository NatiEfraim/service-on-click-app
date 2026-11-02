import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { jsPDF } from 'jspdf';
import { describe, expect, it } from 'vitest';
import { BIDI, buildPdf, buildPdfDocument, bytesToBase64, cleanText, fit, fontSizeFor, hasHebrew } from './pdf';

const font = (name) => bytesToBase64(new Uint8Array(readFileSync(join(process.cwd(), 'public', 'fonts', name))));
const fonts = { regular: font('Assistant-Regular.ttf'), bold: font('Assistant-Bold.ttf') };

const report = (columns, rows) => ({
  title: 'דוח קריאות · שירות בקליק',
  subtitle: 'הופק ב-01.11.2026 16:30 · 576 קריאות · סינון: סטטוס: הועברה לאישור סופי | חורגת מיעד: כן',
  columns: Array.from({ length: columns }, (_, c) => `עמודה ${c + 1}`),
  rows: Array.from({ length: rows }, (_, r) => Array.from({ length: columns }, (_, c) => (c === 0 ? String(56000 + r) : `ערך ${r} ו-${c} (בדיקה)`))),
});

describe('text helpers', () => {
  it('knows Hebrew from everything else', () => {
    expect(hasHebrew('שלום')).toBe(true);
    expect(hasHebrew('abc 123')).toBe(false);
    expect(hasHebrew('abc ת')).toBe(true);
  });

  it('removes the invisible direction marks that locale formatting inserts', () => {
    const marked = `${String.fromCodePoint(0x200f)}5/11/2026${String.fromCodePoint(0x200e)} ${String.fromCodePoint(0x202b)}שלום${String.fromCodePoint(0x202c)}${String.fromCodePoint(0x2067)}x${String.fromCodePoint(0x2069)}`;
    expect(cleanText(marked)).toBe('5/11/2026 שלוםx');
    expect(cleanText(null)).toBe('');
    expect(cleanText(42)).toBe('42');
  });

  it('uses the bidi options of the finished example (typed order in, right-to-left paragraph, visual order out, mirrored brackets)', () => {
    expect(BIDI).toEqual({ isInputVisual: false, isOutputVisual: true, isInputRtl: true, isOutputRtl: false, isSymmetricSwapping: true });
  });

  it('shrinks the type as columns are added', () => {
    expect([3, 5, 6, 8, 9, 11, 12, 15].map(fontSizeFor)).toEqual([9.5, 9.5, 9, 9, 8, 8, 7, 7]);
  });

  it('turns bytes into base64 in chunks without running out of stack', () => {
    const big = new Uint8Array(200_000).map((_, i) => i % 251);
    expect(Buffer.from(bytesToBase64(big), 'base64').equals(Buffer.from(big))).toBe(true);
  });
});

describe('fit', () => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.addFileToVFS('Assistant-Regular.ttf', fonts.regular);
  doc.addFont('Assistant-Regular.ttf', 'Assistant', 'normal');
  doc.setFont('Assistant', 'normal');
  doc.setFontSize(9);

  it('leaves a text that fits alone', () => {
    expect(fit(doc, 'קצר', 200)).toBe('קצר');
  });

  it('cuts a long text and ends it with an ellipsis that fits', () => {
    const long = 'טקסט ארוך מאוד מאוד שלא נכנס בעמודה צרה';
    const cut = fit(doc, long, 60);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut.length).toBeLessThan(long.length);
    expect(doc.getTextWidth(cut)).toBeLessThanOrEqual(60);
    // and it is the longest start that fits
    expect(doc.getTextWidth(`${long.slice(0, cut.length)}…`)).toBeGreaterThan(60);
  });

  it('degrades to just the ellipsis when nothing fits', () => {
    expect(fit(doc, 'אבגדה', 1)).toBe('…');
  });
});

describe('buildPdfDocument', () => {
  it('lays a short report on one portrait page', async () => {
    const doc = await buildPdfDocument(report(4, 10), fonts);
    expect(doc.getNumberOfPages()).toBe(1);
    expect(doc.internal.pageSize.getWidth()).toBeLessThan(doc.internal.pageSize.getHeight());
  });

  it('goes landscape from six columns up', async () => {
    const five = await buildPdfDocument(report(5, 3), fonts);
    const six = await buildPdfDocument(report(6, 3), fonts);
    expect(five.internal.pageSize.getWidth()).toBeLessThan(five.internal.pageSize.getHeight());
    expect(six.internal.pageSize.getWidth()).toBeGreaterThan(six.internal.pageSize.getHeight());
  });

  it('flows a long report over several pages', async () => {
    const doc = await buildPdfDocument(report(4, 200), fonts);
    // portrait A4: (842 - 2*32 - 14 - title block) / 19pt rows is about 38 rows a page
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(5);
    expect(doc.getNumberOfPages()).toBeLessThanOrEqual(7);
  });

  it('still makes a valid document when there is nothing to list', async () => {
    const doc = await buildPdfDocument(report(3, 0), fonts, 'אין קריאות');
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('copes with empty cells, missing cells and cells holding numbers as text', async () => {
    const doc = await buildPdfDocument({ title: 't', subtitle: '', columns: ['a', 'b', 'c'], rows: [['', 'x'], ['1', '2', '3'], []] }, fonts);
    expect(doc.getNumberOfPages()).toBe(1);
  });
});

describe('buildPdf', () => {
  it('returns a PDF file', async () => {
    const blob = await buildPdf(report(4, 30), { fonts });
    expect(blob.type).toBe('application/pdf');
    const head = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).subarray(0, 8));
    expect(head).toMatch(/^%PDF-1\.\d/);
    expect(blob.size).toBeGreaterThan(5000);
  });
});

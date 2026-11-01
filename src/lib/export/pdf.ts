import { jsPDF } from 'jspdf';

/**
 * A table report as a PDF, built in the browser with jsPDF. Nothing is loaded from the network except the two Assistant font files that
 * ship with the app (`/fonts/Assistant-Regular.ttf`, `-Bold.ttf`: Hebrew + Latin subsets). A4, portrait - landscape from six columns up;
 * the header row repeats on every page; the first column sits on the right, as a Hebrew reader expects.
 *
 * Hebrew is laid out by jsPDF's own Unicode bidi engine, told that the text is logical (typed order), the paragraph is right-to-left and
 * the output should be visual, with mirrored brackets - the same options the finished example UI uses, which were checked glyph by glyph
 * against python-bidi on Hebrew mixed with digits, dates, Latin and brackets. Text with no Hebrew letter in it is placed as it is.
 */

export interface PdfReport {
  title: string;
  /** Lines under the title (when it was made, how many rows, the filters). Wrapped to the page width. */
  subtitle: string;
  /** Header cells, first column first (it is drawn rightmost). */
  columns: string[];
  rows: string[][];
}

/** The two TTF files as base64 (what jsPDF's virtual file system takes). */
export interface PdfFonts {
  regular: string;
  bold: string;
}

export const FONT_URLS = { regular: '/fonts/Assistant-Regular.ttf', bold: '/fonts/Assistant-Bold.ttf' } as const;

const FAMILY = 'Assistant';
const MARGIN = 32;
const MAX_COLUMN_WIDTH = 170;
const INK: [number, number, number] = [43, 36, 51];
const MUTE: [number, number, number] = [95, 86, 106];
const GRAPE: [number, number, number] = [61, 49, 74];
const BAND: [number, number, number] = [246, 245, 240];
const RULE: [number, number, number] = [226, 224, 211];

/** jsPDF bidi options: typed (logical) input, right-to-left paragraph, visual output, mirrored brackets. */
export const BIDI = { isInputVisual: false, isOutputVisual: true, isInputRtl: true, isOutputRtl: false, isSymmetricSwapping: true } as const;

const HEBREW = /[\u{0590}-\u{05ff}]/u;
/** Direction marks (what `Intl` and copy-paste insert) and zero-width characters: invisible, and the font has no glyph for them. */
const INVISIBLE = /[\u{200e}\u{200f}\u{61c}\u{202a}-\u{202e}\u{2066}-\u{2069}\u{200b}-\u{200d}\u{feff}]/gu;

export function hasHebrew(text: string): boolean {
  return HEBREW.test(text);
}

/** The text as it is drawn: a string, without the invisible characters the font cannot show. */
export function cleanText(value: unknown): string {
  return String(value ?? '').replace(INVISIBLE, '');
}

/** Smaller type when there are many columns; the row height follows. */
export function fontSizeFor(columnCount: number): number {
  if (columnCount <= 5) return 9.5;
  if (columnCount <= 8) return 9;
  if (columnCount <= 11) return 8;
  return 7;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function fetchBase64(url: string): Promise<string> {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`font ${url}: ${response.status}`);
  return bytesToBase64(new Uint8Array(await response.arrayBuffer()));
}

let fontsPromise: Promise<PdfFonts> | null = null;

/** Fetches the fonts once per page load; a failure is not remembered, so the next click tries again. */
export function loadFonts(): Promise<PdfFonts> {
  if (!fontsPromise) {
    const pending = Promise.all([fetchBase64(FONT_URLS.regular), fetchBase64(FONT_URLS.bold)]).then(([regular, bold]) => ({ regular, bold }));
    pending.catch(() => {
      if (fontsPromise === pending) fontsPromise = null;
    });
    fontsPromise = pending;
  }
  return fontsPromise;
}

type Align = 'left' | 'center' | 'right';

/** Draws one line. Hebrew goes through the bidi engine; everything else is placed as it is. */
function put(doc: jsPDF, value: string, x: number, y: number, align: Align): void {
  const text = cleanText(value);
  doc.text(text, x, y, hasHebrew(text) ? { align, ...BIDI } : { align });
}

/** The longest start of the text that fits `width` with an ellipsis after it. */
export function fit(doc: jsPDF, value: string, width: number): string {
  const text = cleanText(value);
  if (doc.getTextWidth(text) <= width) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.getTextWidth(`${text.slice(0, mid)}…`) <= width) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, lo).trimEnd()}…`;
}

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export interface PdfBuildOptions {
  fonts?: PdfFonts;
  /** Said when there is nothing to list. */
  emptyText?: string;
}

/** Lays the report out on pages and returns the open document (so a test can look at it); `buildPdf` is the one to call. */
export async function buildPdfDocument(report: PdfReport, fonts: PdfFonts, emptyText = 'אין נתונים להצגה'): Promise<jsPDF> {
  const { columns, rows } = report;
  const doc = new jsPDF({ orientation: columns.length > 5 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4', compress: true });
  doc.setProperties({ title: 'Service On Click report', creator: 'Service On Click' });
  doc.addFileToVFS('Assistant-Regular.ttf', fonts.regular);
  doc.addFont('Assistant-Regular.ttf', FAMILY, 'normal');
  doc.addFileToVFS('Assistant-Bold.ttf', fonts.bold);
  doc.addFont('Assistant-Bold.ttf', FAMILY, 'bold');

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const right = pageW - MARGIN;
  const fs = fontSizeFor(columns.length);
  const rowH = Math.round(fs * 2);
  const pad = columns.length > 9 ? 3.5 : 5;

  // column widths: as wide as the longest of (a sample of) the texts, then scaled to fill the page
  const cells = rows.map((row) => columns.map((_, i) => cleanText(row[i])));
  doc.setFontSize(fs);
  doc.setFont(FAMILY, 'bold');
  const headerWidths = columns.map((label) => doc.getTextWidth(cleanText(label)));
  doc.setFont(FAMILY, 'normal');
  const stride = Math.max(1, Math.ceil(cells.length / 400));
  const natural = columns.map((_, i) => {
    let widest = headerWidths[i] + 2 * pad + 4;
    for (let r = 0; r < cells.length; r += stride) widest = Math.max(widest, doc.getTextWidth(cells[r][i]) + 2 * pad);
    return Math.min(MAX_COLUMN_WIDTH, widest);
  });
  const scale = (pageW - 2 * MARGIN) / natural.reduce((sum, w) => sum + w, 0);
  const widths = natural.map((w) => w * scale);

  const drawHeader = (y: number): number => {
    doc.setFillColor(...GRAPE);
    doc.rect(MARGIN, y, pageW - 2 * MARGIN, rowH + 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(FAMILY, 'bold');
    doc.setFontSize(fs);
    let x = right;
    columns.forEach((label, i) => {
      put(doc, fit(doc, label, widths[i] - 2 * pad), x - pad, y + rowH * 0.7, 'right');
      x -= widths[i];
    });
    doc.setFont(FAMILY, 'normal');
    doc.setTextColor(...INK);
    return y + rowH + 2;
  };

  // title block
  doc.setFont(FAMILY, 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  put(doc, report.title, right, MARGIN + 10, 'right');
  doc.setFont(FAMILY, 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTE);
  const subtitleLines: string[] = doc.splitTextToSize(cleanText(report.subtitle), pageW - 2 * MARGIN);
  subtitleLines.forEach((line, i) => put(doc, line, right, MARGIN + 28 + i * 13, 'right'));
  doc.setFontSize(fs);
  doc.setTextColor(...INK);

  let y = drawHeader(MARGIN + 36 + subtitleLines.length * 13);

  if (cells.length === 0) {
    doc.setTextColor(...MUTE);
    put(doc, emptyText, right - pad, y + rowH * 0.7, 'right');
  }

  for (let r = 0; r < cells.length; r++) {
    if (y + rowH > pageH - MARGIN - 14) {
      doc.addPage();
      y = drawHeader(MARGIN);
    }
    if (r % 2) {
      doc.setFillColor(...BAND);
      doc.rect(MARGIN, y, pageW - 2 * MARGIN, rowH, 'F');
    }
    let x = right;
    cells[r].forEach((value, i) => {
      put(doc, fit(doc, value, widths[i] - 2 * pad), x - pad, y + rowH * 0.67, 'right');
      x -= widths[i];
    });
    doc.setDrawColor(...RULE);
    doc.line(MARGIN, y + rowH, pageW - MARGIN, y + rowH);
    y += rowH;
    // a long report must not freeze the page (the spinner on the button keeps turning)
    if (r % 250 === 249) await nextTick();
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont(FAMILY, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTE);
    put(doc, `עמוד ${p} מתוך ${pages}`, pageW / 2, pageH - 16, 'center');
  }
  return doc;
}

/** The PDF, ready to download. Fetches the fonts the first time (they are cached after that). */
export async function buildPdf(report: PdfReport, options: PdfBuildOptions = {}): Promise<Blob> {
  const fonts = options.fonts ?? (await loadFonts());
  const doc = await buildPdfDocument(report, fonts, options.emptyText);
  return doc.output('blob');
}

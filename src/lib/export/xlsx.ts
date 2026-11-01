import { createZip, type ZipEntry, type ZipOptions } from './zip';

/**
 * A small, dependency-free .xlsx writer: one worksheet, text / number / date cells, a right-to-left sheet view, column widths, an
 * auto-filter and a frozen, filled bold header row. An .xlsx is a ZIP of XML parts (Office Open XML); the parts written here are
 * [Content_Types].xml, _rels/.rels, xl/workbook.xml, xl/_rels/workbook.xml.rels, xl/styles.xml and xl/worksheets/sheet1.xml.
 * Text goes in as inline strings (no shared-strings part), so a cell is self-contained and the writer needs no lookup table.
 */

export type XlsxCell = string | number | boolean | Date | null | undefined;

export interface XlsxColumn {
  header: string;
  /** Width in characters. Left out: fitted to the header and the first rows. */
  width?: number;
}

export interface XlsxSheet {
  /** Tab name. Cleaned up to what Excel accepts (at most 31 characters, none of `[]:*?/\`). */
  name: string;
  columns: XlsxColumn[];
  rows: XlsxCell[][];
  /** Open the sheet right-to-left (default: yes - the screens are Hebrew). */
  rtl?: boolean;
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** What Excel itself enforces. */
export const MAX_ROWS = 1_048_576;
export const MAX_COLUMNS = 16_384;
const MAX_CELL_TEXT = 32_767;

// ---------- text

/**
 * XML 1.0 allows tab, line feed, carriage return and the characters from U+0020 up - except the surrogate range (only as proper pairs)
 * and U+FFFE / U+FFFF. Anything else (other control characters, a lone surrogate) would make the whole file unreadable, so it is dropped.
 */
export function stripIllegalXmlChars(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += text[i] + text[i + 1];
        i++;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) continue;
    if (code === 0x9 || code === 0xa || code === 0xd || (code >= 0x20 && code !== 0xfffe && code !== 0xffff)) out += text[i];
  }
  return out;
}

/** Text safe to put between tags or inside a double-quoted attribute. */
export function escapeXml(text: string): string {
  return stripIllegalXmlChars(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string);
}

/** A tab name Excel accepts: no `[ ] : * ? / \`, not empty, no apostrophe at either end, at most 31 characters. */
export function safeSheetName(name: string, fallback = 'Sheet1'): string {
  let clean = stripIllegalXmlChars(name)
    .replace(/[[\]:*?/\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length > 31) {
    clean = clean.slice(0, 31);
    // never cut a surrogate pair in half
    const last = clean.charCodeAt(30);
    if (last >= 0xd800 && last <= 0xdbff) clean = clean.slice(0, 30);
  }
  clean = clean.replace(/^'+|'+$/g, '').trim();
  return clean || fallback;
}

/** 0 -> A, 25 -> Z, 26 -> AA ... 16383 -> XFD. */
export function columnName(index: number): string {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const rest = (n - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

/**
 * The date as Excel stores it: days since 1899-12-30, the fraction being the time of day. Excel has no time zones, so the local
 * wall-clock reading is used - the cell shows the same day and time the person sees on screen.
 */
export function excelSerial(date: Date): number {
  const wall = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
  return wall / 86_400_000 + 25_569;
}

// ---------- cells

const STYLE_HEADER = 1;
const STYLE_DATE = 2;
const STYLE_DATETIME = 3;

function needsPreserve(text: string): boolean {
  return /^\s|\s$|\s\s|[\n\t\r]/.test(text);
}

function cellXml(ref: string, value: XlsxCell, style = 0): string {
  const s = style ? ` s="${style}"` : '';
  if (value === null || value === undefined) return style ? `<c r="${ref}"${s}/>` : '';
  if (typeof value === 'number') return Number.isFinite(value) ? `<c r="${ref}"${s}><v>${value}</v></c>` : '';
  if (typeof value === 'boolean') return `<c r="${ref}"${s} t="b"><v>${value ? 1 : 0}</v></c>`;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const hasTime = value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0;
    return `<c r="${ref}" s="${style || (hasTime ? STYLE_DATETIME : STYLE_DATE)}"><v>${excelSerial(value)}</v></c>`;
  }
  const text = stripIllegalXmlChars(value).slice(0, MAX_CELL_TEXT);
  if (text === '') return style ? `<c r="${ref}"${s}/>` : '';
  return `<c r="${ref}"${s} t="inlineStr"><is><t${needsPreserve(text) ? ' xml:space="preserve"' : ''}>${escapeXml(text)}</t></is></c>`;
}

/** The number of characters a cell shows (for fitting column widths). */
function shownLength(value: XlsxCell): number {
  if (value === null || value === undefined) return 0;
  if (value instanceof Date) return 10;
  if (typeof value === 'number') return String(value).length;
  if (typeof value === 'boolean') return 5;
  return Math.max(...value.split('\n').map((line) => line.length), 0);
}

/** Header and the first rows decide the width: enough for the longest text, never wider than a screenful. */
export function fitWidth(header: string, values: readonly XlsxCell[], sample = 300): number {
  let longest = header.length + 3; // room for the filter button
  for (let i = 0; i < Math.min(values.length, sample); i++) longest = Math.max(longest, shownLength(values[i]));
  return Math.min(50, Math.max(10, Math.round(longest * 1.15 + 2)));
}

// ---------- parts

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

export function contentTypesXml(): string {
  return (
    `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>'
  );
}

export function rootRelsXml(): string {
  return `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}"><Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
}

export function workbookRelsXml(): string {
  return (
    `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}">` +
    `<Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="${NS_REL}/styles" Target="styles.xml"/>` +
    '</Relationships>'
  );
}

/** `'Sheet name'!$A$1:$E$10` - the quote inside a name is doubled. */
function qualified(sheetName: string, range: string): string {
  return `'${sheetName.replace(/'/g, "''")}'!${range}`;
}

export function workbookXml(sheetName: string, filterRange: string): string {
  const name = escapeXml(sheetName);
  return (
    `${XML_HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
    '<bookViews><workbookView activeTab="0"/></bookViews>' +
    `<sheets><sheet name="${name}" sheetId="1" r:id="rId1"/></sheets>` +
    '<definedNames>' +
    `<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${escapeXml(qualified(sheetName, filterRange))}</definedName>` +
    `<definedName name="_xlnm.Print_Titles" localSheetId="0">${escapeXml(qualified(sheetName, '$1:$1'))}</definedName>` +
    '</definedNames>' +
    '</workbook>'
  );
}

/** Styles: 0 plain, 1 header (bold white on grape), 2 date, 3 date and time. */
export function stylesXml(): string {
  return (
    `${XML_HEAD}<styleSheet xmlns="${NS_MAIN}">` +
    '<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy\\ hh:mm"/></numFmts>' +
    '<fonts count="2">' +
    '<font><sz val="11"/><color rgb="FF2B2433"/><name val="Calibri"/><family val="2"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>' +
    '</fonts>' +
    '<fills count="3">' +
    '<fill><patternFill patternType="none"/></fill>' +
    '<fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF3D314A"/><bgColor indexed="64"/></patternFill></fill>' +
    '</fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="4">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>'
  );
}

export function worksheetXml(sheet: XlsxSheet): string {
  const { columns, rows } = sheet;
  if (columns.length === 0) throw new Error('xlsx: at least one column is needed');
  if (columns.length > MAX_COLUMNS) throw new Error('xlsx: too many columns');
  if (rows.length + 1 > MAX_ROWS) throw new Error('xlsx: too many rows');

  const lastColumn = columnName(columns.length - 1);
  const lastRow = rows.length + 1;
  const range = `A1:${lastColumn}${lastRow}`;
  const rtl = sheet.rtl ?? true;

  const widths = columns.map((column, index) => column.width ?? fitWidth(column.header, rows.map((row) => row[index])));
  const cols = columns.map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="${widths[index]}" customWidth="1"/>`).join('');

  const headerRow =
    `<row r="1" ht="22" customHeight="1">` + columns.map((column, index) => cellXml(`${columnName(index)}1`, column.header, STYLE_HEADER)).join('') + '</row>';

  const body: string[] = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let cells = '';
    for (let c = 0; c < columns.length; c++) cells += cellXml(`${columnName(c)}${r + 2}`, row[c]);
    body.push(`<row r="${r + 2}">${cells}</row>`);
  }

  return (
    `${XML_HEAD}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
    '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
    `<dimension ref="${range}"/>` +
    `<sheetViews><sheetView${rtl ? ' rightToLeft="1"' : ''} tabSelected="1" workbookViewId="0">` +
    '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' +
    '</sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15"/>' +
    `<cols>${cols}</cols>` +
    `<sheetData>${headerRow}${body.join('')}</sheetData>` +
    `<autoFilter ref="${range}"/>` +
    '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
    '<pageSetup paperSize="9" orientation="landscape" fitToHeight="0"/>' +
    '</worksheet>'
  );
}

/** All the parts of the package, in the order they are stored. */
export function xlsxParts(sheet: XlsxSheet): { name: string; xml: string }[] {
  const name = safeSheetName(sheet.name);
  const range = `$A$1:$${columnName(sheet.columns.length - 1)}$${sheet.rows.length + 1}`;
  return [
    { name: '[Content_Types].xml', xml: contentTypesXml() },
    { name: '_rels/.rels', xml: rootRelsXml() },
    { name: 'xl/workbook.xml', xml: workbookXml(name, range) },
    { name: 'xl/_rels/workbook.xml.rels', xml: workbookRelsXml() },
    { name: 'xl/styles.xml', xml: stylesXml() },
    { name: 'xl/worksheets/sheet1.xml', xml: worksheetXml(sheet) },
  ];
}

/** The .xlsx file as bytes. */
export async function buildXlsxBytes(sheet: XlsxSheet, options?: ZipOptions): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const entries: ZipEntry[] = xlsxParts(sheet).map((part) => ({ name: part.name, data: encoder.encode(part.xml) }));
  return createZip(entries, options);
}

/** The .xlsx file, ready to download. */
export async function buildXlsx(sheet: XlsxSheet, options?: ZipOptions): Promise<Blob> {
  return new Blob([(await buildXlsxBytes(sheet, options)) as BlobPart], { type: XLSX_MIME });
}

import { createZip } from './zip';







export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Excel's own limits. */
export const MAX_ROWS = 1_048_576;
export const MAX_COLUMNS = 16_384;
const MAX_CELL_TEXT = 32_767;

/** Drops characters illegal in XML 1.0 (control chars, lone surrogates, U+FFFE / U+FFFF) that corrupt the file. */
export function stripIllegalXmlChars(text) {
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

export function escapeXml(text) {
  return stripIllegalXmlChars(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}

/** Excel tab name: max 31 characters, none of `[ ] : * ? / \`, no edge apostrophes. */
export function safeSheetName(name, fallback = 'Sheet1') {
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

export function columnName(index) {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const rest = (n - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

/** Days since 1899-12-30; Excel has no time zones, so the local wall-clock reading is used. */
export function excelSerial(date) {
  const wall = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
  return wall / 86_400_000 + 25_569;
}

const STYLE_HEADER = 1;
const STYLE_DATE = 2;
const STYLE_DATETIME = 3;

function needsPreserve(text) {
  return /^\s|\s$|\s\s|[\n\t\r]/.test(text);
}

function cellXml(ref, value, style = 0) {
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

function shownLength(value) {
  if (value === null || value === undefined) return 0;
  if (value instanceof Date) return 10;
  if (typeof value === 'number') return String(value).length;
  if (typeof value === 'boolean') return 5;
  return Math.max(...value.split('\n').map((line) => line.length), 0);
}

/** Width from the header and a sample of rows, clamped to 10..50. */
export function fitWidth(header, values, sample = 300) {
  let longest = header.length + 3; // room for the filter button
  for (let i = 0; i < Math.min(values.length, sample); i++) longest = Math.max(longest, shownLength(values[i]));
  return Math.min(50, Math.max(10, Math.round(longest * 1.15 + 2)));
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

export function contentTypesXml() {
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

export function rootRelsXml() {
  return `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}"><Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
}

export function workbookRelsXml() {
  return (
    `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}">` +
    `<Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="${NS_REL}/styles" Target="styles.xml"/>` +
    '</Relationships>'
  );
}

function qualified(sheetName, range) {
  return `'${sheetName.replace(/'/g, "''")}'!${range}`;
}

export function workbookXml(sheetName, filterRange) {
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
export function stylesXml() {
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

export function worksheetXml(sheet) {
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

  const body = [];
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

export function xlsxParts(sheet) {
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

export async function buildXlsxBytes(sheet, options) {
  const encoder = new TextEncoder();
  const entries = xlsxParts(sheet).map((part) => ({ name: part.name, data: encoder.encode(part.xml) }));
  return createZip(entries, options);
}

export async function buildXlsx(sheet, options) {
  return new Blob([(await buildXlsxBytes(sheet, options))], { type: XLSX_MIME });
}

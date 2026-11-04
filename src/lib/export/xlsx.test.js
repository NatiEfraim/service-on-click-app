import { describe, expect, it } from 'vitest';
import { assertWellFormedXml, text, unzip } from './test-utils';
import { buildXlsx, buildXlsxBytes, columnName, escapeXml, excelSerial, fitWidth, safeSheetName, stripIllegalXmlChars, XLSX_MIME } from './xlsx';

const sheet = {
  name: 'דוח קריאות',
  columns: [{ header: 'מספר הזמנה' }, { header: 'סוג הזמנה' }, { header: 'תאריך פתיחה' }, { header: 'חורגת מיעד' }, { header: 'זמן מפתיחה (שעות)', width: 20 }],
  rows: [
    [56031, 'ציוד גברים', new Date(2026, 10, 1), 'לא', 3.5],
    [255563, 'רכב שיתופי & <מיוחד> "ציטוט"', new Date(2026, 9, 29, 9, 6, 33), 'כן', null],
    [1, '  מרווחים  ', null, '', 0],
  ],
};

async function open(input = sheet) {
  const entries = unzip(await buildXlsxBytes(input, { date: new Date(2026, 10, 1, 12, 0, 0) }));
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  return { entries, part: (name) => text(byName.get(name)) };
}

describe('the package', () => {
  it('has the parts of a one-sheet workbook and nothing else', async () => {
    const { entries } = await open();
    expect(entries.map((e) => e.name)).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
    ]);
  });

  it('is made of well formed XML in every part', async () => {
    const { entries } = await open();
    for (const entry of entries) expect(() => assertWellFormedXml(text(entry)), entry.name).not.toThrow();
  });

  it('declares every part in the content types and wires the relationships', async () => {
    const { part } = await open();
    const types = part('[Content_Types].xml');
    expect(types).toContain('PartName="/xl/workbook.xml"');
    expect(types).toContain('spreadsheetml.sheet.main+xml');
    expect(types).toContain('PartName="/xl/worksheets/sheet1.xml"');
    expect(types).toContain('PartName="/xl/styles.xml"');
    expect(part('_rels/.rels')).toContain('Target="xl/workbook.xml"');
    const rels = part('xl/_rels/workbook.xml.rels');
    expect(rels).toContain('Id="rId1"');
    expect(rels).toContain('Target="worksheets/sheet1.xml"');
    expect(rels).toContain('Target="styles.xml"');
  });

  it('is served as an Excel workbook', async () => {
    const blob = await buildXlsx(sheet);
    expect(blob.type).toBe(XLSX_MIME);
    expect(blob.size).toBeGreaterThan(500);
  });
});

describe('the workbook', () => {
  it('names the sheet and points the filter and the print titles at it', async () => {
    const { part } = await open();
    const workbook = part('xl/workbook.xml');
    expect(workbook).toContain('<sheet name="דוח קריאות" sheetId="1" r:id="rId1"/>');
    expect(workbook).toContain('>&apos;דוח קריאות&apos;!$A$1:$E$4</definedName>');
    expect(workbook).toContain('>&apos;דוח קריאות&apos;!$1:$1</definedName>');
  });

  it('cleans up the sheet name', async () => {
    const { part } = await open({ ...sheet, name: "דוח: [קריאות]/2026 * ? \\ 'מיוחד' ארוך מאוד מאוד מאוד מאוד" });
    // what Excel sees is the text after the XML entities are read back
    const name = /<sheet name="([^"]*)"/.exec(part('xl/workbook.xml'))[1].replace(/&apos;/g, "'");
    expect(name.length).toBeLessThanOrEqual(31);
    expect(name).not.toMatch(/[[\]:*?/\\]/);
    expect(name.startsWith('דוח')).toBe(true);
  });
});

describe('the worksheet', () => {
  it('opens right-to-left, with a frozen header row', async () => {
    const xml = (await open()).part('xl/worksheets/sheet1.xml');
    expect(xml).toMatch(/<sheetView rightToLeft="1" /);
    expect(xml).toContain('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>');
  });

  it('can be opened left-to-right', async () => {
    const xml = (await open({ ...sheet, rtl: false })).part('xl/worksheets/sheet1.xml');
    expect(xml).not.toContain('rightToLeft');
  });

  it('puts an auto-filter on the header row and covers the whole table', async () => {
    const xml = (await open()).part('xl/worksheets/sheet1.xml');
    expect(xml).toContain('<dimension ref="A1:E4"/>');
    expect(xml).toContain('<autoFilter ref="A1:E4"/>');
  });

  it('sets a width for every column (given, or fitted to the content)', async () => {
    const xml = (await open()).part('xl/worksheets/sheet1.xml');
    const widths = [...xml.matchAll(/<col min="(\d+)" max="\d+" width="([\d.]+)" customWidth="1"\/>/g)].map((m) => Number(m[2]));
    expect(widths).toHaveLength(5);
    expect(widths[4]).toBe(20);
    expect(widths.every((w) => w >= 10 && w <= 50)).toBe(true);
    expect(widths[1]).toBeGreaterThan(widths[0] - 1); // the long text column is not narrower than the number column
  });

  it('writes the header in the header style and the data as typed cells', async () => {
    const xml = (await open()).part('xl/worksheets/sheet1.xml');
    expect(xml).toContain('<c r="A1" s="1" t="inlineStr"><is><t>מספר הזמנה</t></is></c>');
    expect(xml).toContain('<c r="A2"><v>56031</v></c>');
    expect(xml).toContain('<c r="B2" t="inlineStr"><is><t>ציוד גברים</t></is></c>');
    expect(xml).toContain('<c r="E2"><v>3.5</v></c>');
    expect(xml).toContain('<c r="E4"><v>0</v></c>');
  });

  it('writes dates as Excel dates (with a time only when there is one) and skips empty cells', async () => {
    const xml = (await open()).part('xl/worksheets/sheet1.xml');
    expect(xml).toContain(`<c r="C2" s="2"><v>${excelSerial(new Date(2026, 10, 1))}</v></c>`);
    expect(xml).toContain('<c r="C2" s="2"><v>46327</v></c>');
    expect(xml).toMatch(/<c r="C3" s="3"><v>46324\.\d+<\/v><\/c>/);
    expect(xml).not.toContain('r="E3"');
    expect(xml).not.toContain('r="C4"');
    expect(xml).not.toContain('r="D4"');
  });

  it('escapes the text and keeps meaningful spaces', async () => {
    const xml = (await open()).part('xl/worksheets/sheet1.xml');
    expect(xml).toContain('רכב שיתופי &amp; &lt;מיוחד&gt; &quot;ציטוט&quot;');
    expect(xml).toContain('<t xml:space="preserve">  מרווחים  </t>');
  });

  it('puts the elements in the order the schema demands', async () => {
    const names = assertWellFormedXml((await open()).part('xl/worksheets/sheet1.xml'));
    const order = ['sheetPr', 'dimension', 'sheetViews', 'sheetFormatPr', 'cols', 'sheetData', 'autoFilter', 'pageMargins', 'pageSetup'];
    const positions = order.map((name) => names.indexOf(name));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('holds the header and one row per record', async () => {
    const rows = 1234;
    const big = { name: 'x', columns: [{ header: 'n' }, { header: 't' }], rows: Array.from({ length: rows }, (_, i) => [i, `שורה ${i}`]) };
    const xml = (await open(big)).part('xl/worksheets/sheet1.xml');
    expect(xml.match(/<row /g)).toHaveLength(rows + 1);
    expect(xml).toContain(`<autoFilter ref="A1:B${rows + 1}"/>`);
  });

  it('needs at least one column', async () => {
    await expect(buildXlsxBytes({ name: 'x', columns: [], rows: [] })).rejects.toThrow(/column/);
  });

  it('is fine with no records at all', async () => {
    const xml = (await open({ ...sheet, rows: [] })).part('xl/worksheets/sheet1.xml');
    expect(xml).toContain('<autoFilter ref="A1:E1"/>');
    expect(xml.match(/<row /g)).toHaveLength(1);
  });
});

describe('the styles', () => {
  it('has the bold, filled header style and the two date formats', async () => {
    const xml = (await open()).part('xl/styles.xml');
    expect(xml).toContain('<b/>');
    expect(xml).toContain('patternType="solid"');
    expect(xml).toContain('formatCode="dd/mm/yyyy"');
    expect(xml).toContain('<cellXfs count="4">');
  });
});

describe('text helpers', () => {
  it('drops the characters XML 1.0 forbids and keeps tab, newline and Hebrew', () => {
    expect(stripIllegalXmlChars('a\u{0}b\u{8}c\u{b}d\u{c}e\u{1f}f\u{fffe}g\u{ffff}h')).toBe('abcdefgh');
    expect(stripIllegalXmlChars('x\ty\nz\rש')).toBe('x\ty\nz\rש');
    expect(stripIllegalXmlChars('lone \ud800 high and \udc00 low')).toBe('lone  high and  low');
    expect(stripIllegalXmlChars('pair 😀 stays')).toBe('pair 😀 stays');
  });

  it('escapes the five XML characters', () => {
    expect(escapeXml(`<a href="x">Tom & 'Jerry'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;');
    expect(escapeXml('a\u0000b')).toBe('ab');
  });

  it('turns a column number into letters', () => {
    expect([0, 1, 25, 26, 27, 51, 52, 701, 702, 16383].map(columnName)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA', 'ZZ', 'AAA', 'XFD']);
  });

  it('keeps a sheet name within what Excel accepts', () => {
    expect(safeSheetName('דוח קריאות')).toBe('דוח קריאות');
    expect(safeSheetName('a[b]c:d*e?f/g\\h')).toBe('a b c d e f g h');
    expect(safeSheetName("'quoted'")).toBe('quoted');
    expect(safeSheetName('x'.repeat(40))).toHaveLength(31);
    expect(safeSheetName('   ')).toBe('Sheet1');
    expect(safeSheetName('[]:*?/\\', 'דוח')).toBe('דוח');
    // 30 letters then an emoji (a surrogate pair) must not be cut in half
    expect(safeSheetName('x'.repeat(30) + '😀')).toBe('x'.repeat(30));
  });

  it('converts a date to the number Excel stores', () => {
    expect(excelSerial(new Date(2026, 10, 1))).toBe(46327);
    expect(excelSerial(new Date(2026, 10, 1, 12, 0, 0))).toBe(46327.5);
    expect(excelSerial(new Date(2000, 0, 1))).toBe(36526);
  });

  it('fits a width to the content, within bounds', () => {
    expect(fitWidth('א', ['1'])).toBe(10);
    expect(fitWidth('כותרת', ['x'.repeat(200)])).toBe(50);
    expect(fitWidth('כותרת', ['x'.repeat(20)])).toBeGreaterThan(20);
  });
});

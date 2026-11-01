import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { text, unzip } from './test-utils';
import { createZip, crc32, deflateRaw, dosDateTime } from './zip';

const bytes = (value: string) => new TextEncoder().encode(value);

describe('crc32', () => {
  it('matches the published check values', () => {
    expect(crc32(bytes('123456789'))).toBe(0xcbf43926);
    expect(crc32(bytes(''))).toBe(0);
    expect(crc32(bytes('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339);
  });
});

describe('dosDateTime', () => {
  it('packs date and time into the two 16 bit words of a ZIP header', () => {
    const { time, date } = dosDateTime(new Date(2026, 10, 1, 16, 21, 30));
    expect(time).toBe((16 << 11) | (21 << 5) | 15);
    expect(date).toBe(((2026 - 1980) << 9) | (11 << 5) | 1);
  });

  it('keeps years inside the range the format can hold', () => {
    expect(dosDateTime(new Date(1975, 0, 1)).date >> 9).toBe(0);
    expect(dosDateTime(new Date(2200, 0, 1)).date >> 9).toBe(127);
  });
});

describe('deflateRaw', () => {
  it('produces a raw deflate stream that zlib inflates back (or says it cannot)', async () => {
    const input = bytes('שלום שלום שלום שלום '.repeat(50));
    const deflated = await deflateRaw(input);
    expect(deflated).not.toBeNull();
    expect(deflated!.length).toBeLessThan(input.length);
    const { inflateRawSync } = await import('node:zlib');
    expect(new Uint8Array(inflateRawSync(deflated!))).toEqual(input);
    // sanity check of the helper itself against zlib's own output
    expect(new Uint8Array(inflateRawSync(deflateRawSync(input)))).toEqual(input);
  });
});

describe('createZip', () => {
  const entries = [
    { name: '[Content_Types].xml', data: bytes('<a>' + 'x'.repeat(2000) + '</a>') },
    { name: 'xl/דוח קריאות.txt', data: bytes('שלום עולם - ' + 'א'.repeat(500)) },
    { name: 'empty.bin', data: new Uint8Array(0) },
    { name: 'tiny.txt', data: bytes('a') },
  ];

  it('stores a real archive: every entry reads back with the right name, bytes and CRC', async () => {
    const zip = await createZip(entries, { date: new Date(2026, 10, 1, 12, 0, 0) });
    expect(String.fromCharCode(zip[0], zip[1])).toBe('PK');
    const back = unzip(zip);
    expect(back.map((e) => e.name)).toEqual(entries.map((e) => e.name));
    back.forEach((entry, i) => expect(entry.data).toEqual(entries[i].data));
  });

  it('deflates what gets smaller and stores what does not', async () => {
    const back = unzip(await createZip(entries));
    const method = (name: string) => back.find((e) => e.name === name)?.method;
    expect(method('[Content_Types].xml')).toBe(8);
    expect(method('xl/דוח קריאות.txt')).toBe(8);
    expect(method('empty.bin')).toBe(0);
    expect(method('tiny.txt')).toBe(0);
  });

  it('can be told not to compress', async () => {
    const zip = await createZip(entries, { compress: false });
    expect(unzip(zip).every((e) => e.method === 0)).toBe(true);
    const compressed = await createZip(entries);
    expect(compressed.length).toBeLessThan(zip.length);
  });

  it('marks the names as UTF-8 so Hebrew paths survive', async () => {
    const back = unzip(await createZip(entries));
    expect(back.every((e) => (e.flags & 0x0800) !== 0)).toBe(true);
  });

  it('ends with a central directory that counts and locates the entries', async () => {
    const zip = await createZip(entries);
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    const end = zip.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 8, true)).toBe(entries.length);
    expect(view.getUint16(end + 10, true)).toBe(entries.length);
    expect(view.getUint32(zip.length - 6, true) + view.getUint32(zip.length - 10, true)).toBe(end);
  });

  it('gives the same bytes for the same input and date (reproducible)', async () => {
    const date = new Date(2026, 10, 1, 12, 0, 0);
    expect(await createZip(entries, { date })).toEqual(await createZip(entries, { date }));
  });

  it('reads back through the helper as text', async () => {
    const back = unzip(await createZip([{ name: 'a.txt', data: bytes('hello שלום') }]));
    expect(text(back[0])).toBe('hello שלום');
  });

  it('refuses a name that cannot be stored', async () => {
    await expect(createZip([{ name: 'a'.repeat(70000), data: bytes('x') }])).rejects.toThrow(/name too long/);
  });
});

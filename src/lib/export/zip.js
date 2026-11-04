



const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;
const UTF8_FLAG = 0x0800;
const VERSION = 20; // 2.0: deflate, folders

let crcTable = null;

function table() {
  if (crcTable) return crcTable;
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  crcTable = t;
  return t;
}

export function crc32(bytes) {
  const t = table();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = t[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** MS-DOS date / time words (2 s resolution, 1980..2107). */
export function dosDateTime(date) {
  const year = Math.min(2107, Math.max(1980, date.getFullYear()));
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/** Raw deflate, or `null` when the runtime lacks `CompressionStream` / `deflate-raw`. */
export async function deflateRaw(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}



const encoder = new TextEncoder();

/** Entries keep their order (put `[Content_Types].xml` first for OOXML). */
export async function createZip(entries, options = {}) {
  if (entries.length > 0xffff) throw new Error('zip: too many files');
  const stamp = dosDateTime(options.date ?? new Date());
  const compress = options.compress ?? true;

  const packed = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    if (nameBytes.length > 0xffff) throw new Error('zip: file name too long');
    if (entry.data.length > 0xfffffffe) throw new Error('zip: file too large');

    let method = METHOD_STORED;
    let body = entry.data;
    if (compress && entry.data.length > 0) {
      const deflated = await deflateRaw(entry.data);
      if (deflated && deflated.length < entry.data.length) {
        method = METHOD_DEFLATE;
        body = deflated;
      }
    }
    packed.push({ nameBytes, method, crc: crc32(entry.data), size: entry.data.length, body, offset });
    offset += 30 + nameBytes.length + body.length;
    if (offset > 0xfffffffe) throw new Error('zip: archive too large');
  }

  const centralSize = packed.reduce((sum, p) => sum + 46 + p.nameBytes.length, 0);
  const out = new Uint8Array(offset + centralSize + 22);
  const view = new DataView(out.buffer);
  let at = 0;

  for (const p of packed) {
    view.setUint32(at, 0x04034b50, true); // local file header
    view.setUint16(at + 4, VERSION, true);
    view.setUint16(at + 6, UTF8_FLAG, true);
    view.setUint16(at + 8, p.method, true);
    view.setUint16(at + 10, stamp.time, true);
    view.setUint16(at + 12, stamp.date, true);
    view.setUint32(at + 14, p.crc, true);
    view.setUint32(at + 18, p.body.length, true); // compressed size
    view.setUint32(at + 22, p.size, true); // uncompressed size
    view.setUint16(at + 26, p.nameBytes.length, true);
    view.setUint16(at + 28, 0, true); // no extra field
    out.set(p.nameBytes, at + 30);
    out.set(p.body, at + 30 + p.nameBytes.length);
    at += 30 + p.nameBytes.length + p.body.length;
  }

  const centralStart = at;
  for (const p of packed) {
    view.setUint32(at, 0x02014b50, true); // central directory header
    view.setUint16(at + 4, VERSION, true); // made by
    view.setUint16(at + 6, VERSION, true); // needed to extract
    view.setUint16(at + 8, UTF8_FLAG, true);
    view.setUint16(at + 10, p.method, true);
    view.setUint16(at + 12, stamp.time, true);
    view.setUint16(at + 14, stamp.date, true);
    view.setUint32(at + 16, p.crc, true);
    view.setUint32(at + 20, p.body.length, true);
    view.setUint32(at + 24, p.size, true);
    view.setUint16(at + 28, p.nameBytes.length, true);
    view.setUint16(at + 30, 0, true); // extra field length
    view.setUint16(at + 32, 0, true); // comment length
    view.setUint16(at + 34, 0, true); // disk number
    view.setUint16(at + 36, 0, true); // internal attributes
    view.setUint32(at + 38, 0, true); // external attributes
    view.setUint32(at + 42, p.offset, true); // where its local header starts
    out.set(p.nameBytes, at + 46);
    at += 46 + p.nameBytes.length;
  }

  view.setUint32(at, 0x06054b50, true); // end of central directory
  view.setUint16(at + 4, 0, true);
  view.setUint16(at + 6, 0, true);
  view.setUint16(at + 8, packed.length, true);
  view.setUint16(at + 10, packed.length, true);
  view.setUint32(at + 12, at - centralStart, true);
  view.setUint32(at + 16, centralStart, true);
  view.setUint16(at + 20, 0, true); // no archive comment
  return out;
}

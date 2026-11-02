/**
 * Helpers for the export tests only (nothing in the app imports this file): read a ZIP back with Node's own zlib, and check that a
 * piece of XML is well formed - so a test can prove what the writers produced instead of trusting their string building.
 */
import { inflateRawSync } from 'node:zlib';
import { crc32 } from './zip';



/** Reads the central directory, then every entry; throws when the archive is damaged (wrong CRC, bad signature, sizes that do not add up). */
export function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error('no end-of-central-directory record');

  const count = view.getUint16(end + 10, true);
  const centralSize = view.getUint32(end + 12, true);
  const centralStart = view.getUint32(end + 16, true);
  if (centralStart + centralSize !== end) throw new Error('central directory does not end where the end record starts');

  const decoder = new TextDecoder('utf-8', { fatal: true });
  const entries = [];
  let at = centralStart;
  for (let i = 0; i < count; i++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error(`bad central header #${i}`);
    const flags = view.getUint16(at + 8, true);
    const method = view.getUint16(at + 10, true);
    const crc = view.getUint32(at + 16, true);
    const compressedSize = view.getUint32(at + 20, true);
    const size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localOffset = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;

    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error(`bad local header for ${name}`);
    const localName = view.getUint16(localOffset + 26, true);
    const localExtra = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localName + localExtra;
    const body = bytes.subarray(start, start + compressedSize);
    const data = method === 8 ? new Uint8Array(inflateRawSync(body)) : new Uint8Array(body);

    if (data.length !== size) throw new Error(`${name}: size ${data.length} != ${size}`);
    if (crc32(data) !== crc) throw new Error(`${name}: wrong crc`);
    entries.push({ name, method, flags, crc, data });
  }
  return entries;
}

export function text(entry) {
  if (!entry) throw new Error('entry missing');
  return new TextDecoder().decode(entry.data);
}

/**
 * Not a full XML parser - enough to catch what string building gets wrong: unclosed or mis-nested tags, a bare `&` or `<` in text,
 * an unquoted attribute, and characters XML 1.0 forbids. Returns the names of the elements in document order.
 */
export function assertWellFormedXml(xml) {
  // eslint-disable-next-line no-control-regex
  const forbidden = /[\u{0}-\u{8}\u{b}\u{c}\u{e}-\u{1f}\u{fffe}\u{ffff}]/u;
  if (forbidden.test(xml)) throw new Error('forbidden character in XML');

  const body = xml.replace(/^<\?xml[^?]*\?>\s*/, '');
  const stack = [];
  const names = [];
  const bareAmpersand = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;
  const token = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>|([^<]+)|(<)/g;
  let match;
  while ((match = token.exec(body)) !== null) {
    const [, closing, name, attributes, selfClosing, textNode, strayAngle] = match;
    if (strayAngle) throw new Error(`malformed tag near: ${body.slice(match.index, match.index + 60)}`);
    if (textNode !== undefined) {
      if (bareAmpersand.test(textNode)) throw new Error(`bare & in text: ${textNode.slice(0, 60)}`);
      if (stack.length === 0 && textNode.trim() !== '') throw new Error('text outside the root element');
      continue;
    }
    if (attributes && bareAmpersand.test(attributes)) throw new Error(`bare & in attribute: ${attributes.slice(0, 60)}`);
    if (closing) {
      if (stack.pop() !== name) throw new Error(`</${name}> does not match`);
    } else {
      names.push(name);
      if (!selfClosing) stack.push(name);
    }
  }
  if (stack.length) throw new Error(`unclosed: ${stack.join(' > ')}`);
  return names;
}

import { describe, expect, it } from 'vitest';
import { exportLines, importLines, importSucceeded } from './results';

const texts = (lines) => lines.map((line) => line.text);
const tones = (lines) => lines.map((line) => line.tone);

describe('exportLines', () => {
  it('reports a send with its channel, count, file and marked rows', () => {
    const lines = exportLines({ enabled: true, channel: 'ftp', result: { destination: 'FTP folder /x/', built: { written: true, records: 4, in_file: 31, file: 'f.json' }, file: 'f.json', marked: 4, errors: [] } }, 'הגדרות', 'records');
    expect(texts(lines)[0]).toBe('מסלול: דרך ה-FTP');
    expect(texts(lines)).toContain('נשלחו 4 הגדרות בקובץ f.json.');
    expect(tones(lines)).not.toContain('bad');
  });
  it('treats an unchanged file as a notice, not an error', () => {
    const lines = exportLines({ enabled: true, channel: 'ftp', result: { built: { written: false, reason: 'unchanged' }, file: 'f.json', marked: 0, errors: [] } }, 'הזמנות', 'bookings');
    expect(tones(lines)).not.toContain('bad');
    expect(texts(lines).join(' ')).toContain('שליחה בכפייה');
  });
  it('says the FTP is off when the hatch is disabled', () => {
    expect(texts(exportLines({ enabled: false }, 'הזמנות', 'bookings'))[0]).toContain('ה-bucket');
  });
  it('reads the booking-status bucket export and its busy notice', () => {
    expect(tones(exportLines({ enabled: true, channel: 'bucket', result: { enabled: true, status: {}, values: {}, config: {} } }, 'הזמנות', 'bookings'))).toContain('ok');
    expect(texts(exportLines({ enabled: true, channel: 'bucket', result: { busy: true } }, 'הזמנות', 'bookings')).join(' ')).toContain('נסו שוב');
  });
  it('shows errors in red and says the flags were kept', () => {
    const lines = exportLines({ enabled: true, channel: 'ftp', result: { built: { written: true, users: 2 }, marked: 0, errors: ['ftp down'] } }, 'משתמשים', 'users');
    expect(lines.at(-1)).toEqual({ tone: 'bad', text: 'ftp down' });
  });
});

describe('importLines', () => {
  it('ok and ran: success', () => {
    const data = { ok: true, ran: true, channel: 'bucket' };
    expect(tones(importLines(data))).toEqual(['info', 'ok']);
    expect(importSucceeded(data)).toBe(true);
  });
  it('ran false: a soft notice', () => {
    expect(tones(importLines({ ok: true, ran: false, channel: 'ftp' }))).toEqual(['info', 'info']);
    expect(importSucceeded({ ok: true, ran: false })).toBe(false);
  });
  it('ok false (HTTP 500): the error as returned', () => {
    const lines = importLines({ ok: false, error: '1 of 2 EXPORT_BOOKING files failed or still wait, see the log.', channel: 'ftp' });
    expect(lines[1]).toEqual({ tone: 'bad', text: '1 of 2 EXPORT_BOOKING files failed or still wait, see the log.' });
  });
  it('no body at all: a server error', () => {
    expect(tones(importLines(undefined))).toEqual(['bad']);
  });
});

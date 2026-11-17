import { describe, expect, it } from 'vitest';
import { toAttachment } from './requesterData';

describe('toAttachment', () => {
  it('shows an image as a picture, by its type or its name', () => {
    expect(toAttachment({ type: 'image', display_name: 'a', url: 'https://x/a?sig=1' }, 0)).toMatchObject({ kind: 'image', inline: true, available: true });
    expect(toAttachment({ type: 'file', display_name: 'photo.JPG', url: 'https://x/f' }, 1)).toMatchObject({ kind: 'image', inline: true });
    expect(toAttachment({ type: 'file', display_name: 'scan', url: 'https://x/scan.png?X-Amz=1' }, 2)).toMatchObject({ kind: 'image', inline: true });
  });
  it('opens a PDF in the viewer and lets any other file download', () => {
    expect(toAttachment({ type: 'file', display_name: 'form.pdf', url: 'https://x/form.pdf' }, 0)).toMatchObject({ kind: 'file', inline: true, mime: 'application/pdf' });
    expect(toAttachment({ type: 'file', display_name: 'data.xlsx', url: 'https://x/data.xlsx' }, 1)).toMatchObject({ kind: 'file', inline: false });
  });
  it('marks a file without an address as not available yet', () => {
    expect(toAttachment({ type: 'image', display_name: 'a.png' }, 0)).toMatchObject({ available: false, url: null });
  });
  it('does not take a dot in the middle of a word for an extension', () => {
    expect(toAttachment({ type: 'file', display_name: 'my.pngfile', url: 'https://x/y' }, 0).kind).toBe('file');
  });
});

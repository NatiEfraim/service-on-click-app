import { describe, expect, it } from 'vitest';
import { attachmentLabel } from './Attachments';

describe('attachmentLabel', () => {
  it('keeps a real file name', () => {
    expect(attachmentLabel({ kind: 'file', name: 'קורות חיים.pdf' }, 1)).toBe('קורות חיים.pdf');
    expect(attachmentLabel({ kind: 'image', name: 'photo-2026.jpg' }, 2)).toBe('photo-2026.jpg');
  });
  it('turns a stored identifier into a numbered label by kind', () => {
    expect(attachmentLabel({ kind: 'image', name: 'bb66a157-7f13-4bff-bb1f-661a9f77191c' }, 2)).toBe('תמונה 2');
    expect(attachmentLabel({ kind: 'file', name: 'bb66a1577f134bffbb1f661a9f77191c.pdf', mime: 'application/pdf' }, 3)).toBe('מסמך PDF 3');
    expect(attachmentLabel({ kind: 'file', name: 'bb66a157-7f13-4bff-bb1f-661a9f77191c.docx' }, 1)).toBe('קובץ 1');
  });
  it('labels a missing name too', () => {
    expect(attachmentLabel({ kind: 'image' }, 4)).toBe('תמונה 4');
  });
});

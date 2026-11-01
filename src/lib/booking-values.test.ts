import { describe, expect, it } from 'vitest';
import type { BookingValueNode } from './api/types';
import { describeValues, editableInitialValue, optionText } from './booking-values';

const plain = (name: string, label: string, value: BookingValueNode['value'], type = 'text', extra: Partial<BookingValueNode> = {}): BookingValueNode => ({
  field_name: name,
  field_display_name: label,
  field_type: { name: type },
  value,
  ...extra,
});

describe('describeValues', () => {
  it('prints plain fields and shows a dash for empty ones', () => {
    const lines = describeValues([plain('a', 'מספר מבנה', 125, 'number'), plain('b', 'הערות', ''), plain('c', 'טלפון', null)]);
    expect(lines.map((l) => [l.label, l.text])).toEqual([
      ['מספר מבנה', '125'],
      ['הערות', '—'],
      ['טלפון', '—'],
    ]);
  });

  it('prints a boolean as yes / no', () => {
    expect(describeValues([plain('a', 'חובה', true), plain('b', 'דחוף', false)]).map((l) => l.text)).toEqual(['כן', 'לא']);
  });

  it('prints the chosen option of a select that sits inside a group, one level deeper', () => {
    const lines = describeValues([
      {
        field_name: 'fault',
        field_display_name: 'סוג תקלה',
        field_type: { name: 'select' },
        form_fields: [
          {
            field_name: 'ac',
            field_display_name: 'מיזוג',
            field_type: { name: 'select' },
            option_fields: { display_name: 'מזגן לא מקרר', field_type: { name: 'text' } },
          },
        ],
      },
    ]);
    expect(lines).toEqual([
      { label: 'סוג תקלה', text: '', depth: 0, group: true },
      { label: 'מיזוג', text: 'מזגן לא מקרר', depth: 1, group: false },
    ]);
  });

  it('joins a multi-select with its quantities', () => {
    const lines = describeValues([
      {
        field_name: 'dairy',
        field_display_name: 'חלבי',
        field_type: { name: 'multi_select' },
        option_fields: [
          { display_name: 'טבעוני', value: 11 },
          { display_name: 'צמחוני', value: 4 },
          { display_name: 'ללא גלוטן', value: 1 },
        ],
      },
    ]);
    expect(lines[0].text).toBe('טבעוני: 11, צמחוני: 4, ללא גלוטן: 1');
  });

  it('follows a chain of options and keeps the free text of "other"', () => {
    expect(optionText({ display_name: 'סופטשל א', option_fields: { display_name: 'L', parent_option_id: 173 } })).toBe('סופטשל א › L');
    expect(optionText({ display_name: 'אחר', value: 'מידה מיוחדת' })).toBe('אחר: מידה מיוחדת');
  });

  it('shows a group that has both a choice of its own and children', () => {
    const lines = describeValues([
      {
        field_name: 'related',
        field_display_name: 'מוצרים נלווים',
        field_type: { name: 'select' },
        option_fields: { display_name: 'סופטשל א', option_fields: { display_name: 'L' } },
        form_fields: [plain('q', 'כמות', 2, 'number')],
      },
    ]);
    expect(lines.map((l) => [l.label, l.text, l.depth])).toEqual([
      ['מוצרים נלווים', 'סופטשל א › L', 0],
      ['כמות', '2', 1],
    ]);
  });

  it('shows a dash for a select nobody chose from', () => {
    const lines = describeValues([{ field_name: 'x', field_display_name: 'שינוי מידה', field_type: { name: 'select' } }]);
    expect(lines[0].text).toBe('—');
  });

  it('copes with an empty or missing tree', () => {
    expect(describeValues(undefined)).toEqual([]);
    expect(describeValues([])).toEqual([]);
  });

  it('leaves out file / image fields: their uploads come from `attachments`, and the value carries presigned bucket URLs', () => {
    const lines = describeValues([
      plain('a', 'מספר מבנה', 125, 'number'),
      {
        field_name: 'images_construction_booking',
        field_display_name: 'תמונות',
        field_type: { id: 23, name: 'image' },
        value: [
          { id: 1, type: 'file', name: 'x.pdf', display_name: 'x', url: 'http://localhost:9000/bucket/x.pdf?X-Amz-Signature=abc' },
          { id: 1, type: 'image', name: 'y.png', url: 'http://localhost:9000/bucket/y.png?X-Amz-Signature=def' },
        ],
      },
    ]);
    expect(lines.map((l) => l.label)).toEqual(['מספר מבנה']);
    expect(JSON.stringify(lines)).not.toContain('X-Amz');
  });

  it('never prints an object, whatever field it arrives in', () => {
    const lines = describeValues([{ field_name: 'odd', field_display_name: 'משהו', field_type: { name: 'text' }, value: [{ a: 1 }, { b: 2 }] }]);
    expect(lines[0].text).toBe('—');
    expect(lines[0].text).not.toContain('object');
  });

  it('joins a list of plain values (a multi-date)', () => {
    const lines = describeValues([{ field_name: 'dates', field_display_name: 'תאריכים', field_type: { name: 'multi_date' }, value: ['01/12/2026', '02/12/2026'] }]);
    expect(lines[0].text).toBe('01/12/2026, 02/12/2026');
  });
});

describe('editableInitialValue', () => {
  const nodes: BookingValueNode[] = [
    plain('start', 'תאריך התחלה', '01/11/2026', 'date', { form_field_id: 97, editable: true }),
    plain('time', 'שעת התחלה', '12:24', 'time', { form_field_id: 98, editable: true }),
    {
      field_name: 'group',
      field_display_name: 'קבוצה',
      field_type: { name: 'select' },
      form_fields: [plain('end', 'תאריך סיום', '05/12/2026', 'date', { form_field_id: 99, editable: true })],
    },
  ];

  it('turns the server date (d/m/Y) into the Y-m-d an input and the API use', () => {
    expect(editableInitialValue(nodes, 97, 'date')).toBe('2026-11-01');
    expect(editableInitialValue(nodes, 99, 'date')).toBe('2026-12-05');
  });

  it('keeps a time as HH:MM', () => {
    expect(editableInitialValue(nodes, 98, 'time')).toBe('12:24');
  });

  it('returns an empty string when the field has no value', () => {
    expect(editableInitialValue(nodes, 1234, 'date')).toBe('');
  });
});

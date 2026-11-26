import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DepartmentChip } from './DepartmentChip';

const html = (booking) => renderToStaticMarkup(createElement(DepartmentChip, { booking }));

describe('DepartmentChip', () => {
  it('shows the label the API resolved, as it comes', () => {
    const markup = html({ booking_type_id: 8, department_id: 5, department_label: 'לי"ד' });
    expect(markup).toContain('chip');
    expect(markup).toContain('לי&quot;ד');
  });

  it('shows the label whatever the id is: the id is never mapped on this side', () => {
    expect(html({ department_id: 99, department_label: 'מחלקה חדשה' })).toContain('מחלקה חדשה');
  });

  it('shows nothing for a booking without a department (other types, or older bookings of 8 and 10)', () => {
    expect(html({ booking_type_id: 8, department_id: null, department_label: null })).toBe('');
    expect(html({ booking_type_id: 3 })).toBe('');
    expect(html({ department_label: '' })).toBe('');
  });

  it('shows nothing without a booking', () => {
    expect(html(undefined)).toBe('');
    expect(html(null)).toBe('');
  });
});

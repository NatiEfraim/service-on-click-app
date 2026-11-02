import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

const ORIGIN = 'http://localhost:3000';

describe('safeNext', () => {
  it('keeps a same-site path with its query', () => {
    expect(safeNext('/requests?view=overdue&types=3', ORIGIN)).toBe('/requests?view=overdue&types=3');
    expect(safeNext('/manage/settings/1/3?tab=form', ORIGIN)).toBe('/manage/settings/1/3?tab=form');
  });

  it('falls back to the home page when there is nothing usable', () => {
    expect(safeNext(null, ORIGIN)).toBe('/');
    expect(safeNext('', ORIGIN)).toBe('/');
    expect(safeNext('requests', ORIGIN)).toBe('/');
  });

  it('refuses every way of leaving the site', () => {
    expect(safeNext('//evil.example/x', ORIGIN)).toBe('/');
    expect(safeNext('/\\evil.example', ORIGIN)).toBe('/');
    expect(safeNext('/\t/evil.example', ORIGIN)).toBe('/'); // a browser strips the tab and reads "//evil.example"
    expect(safeNext('/\n/evil.example', ORIGIN)).toBe('/');
    expect(safeNext('https://evil.example', ORIGIN)).toBe('/');
    expect(safeNext('javascript:alert(1)', ORIGIN)).toBe('/');
  });

  it('does not bounce back to the login page', () => {
    expect(safeNext('/login?next=%2Frequests', ORIGIN)).toBe('/');
  });
});

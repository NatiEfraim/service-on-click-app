import { describe, expect, it } from 'vitest';
import { choicePath } from './requesterData';

const options = [
  { id: 1, name: 'Office', isInput: false, children: [] },
  { id: 2, name: 'Other', isInput: true, inputType: 'number', children: [] },
  { id: 3, name: 'List', isInput: false, children: [{ id: 4, name: 'Sub', isInput: false, children: [{ id: 5, name: 'Deep', isInput: true, children: [] }] }] },
];

describe('choicePath', () => {
  it('is empty when nothing is chosen', () => {
    expect(choicePath(options, '')).toEqual([]);
    expect(choicePath(options, null)).toEqual([]);
  });
  it('finds a top-level choice by id (string or number)', () => {
    expect(choicePath(options, '2').map((node) => node.id)).toEqual([2]);
    expect(choicePath(options, 1).map((node) => node.id)).toEqual([1]);
  });
  it('returns the chain down to a sub-choice', () => {
    expect(choicePath(options, 5).map((node) => node.id)).toEqual([3, 4, 5]);
  });
  it('is empty for an unknown id', () => {
    expect(choicePath(options, 99)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';

import { de, en, zhHK } from '../src/i18n/resources';

const flatten = (value: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(value).flatMap(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof item === 'object' && item
      ? flatten(item as Record<string, unknown>, path)
      : [path];
  });

describe('translation resources', () => {
  it('keeps German and Traditional Chinese keys consistent with English', () => {
    const expected = flatten(en).sort();
    expect(flatten(de).sort()).toEqual(expected);
    expect(flatten(zhHK).sort()).toEqual(expected);
  });

  it.each([en, de, zhHK])(
    'renders canonical status codes without leaking translation keys',
    (locale) => {
      expect(locale.status.IN_PROGRESS).toBeTruthy();
      expect(locale.status.INSPECTION_FOLLOW_UP).toBeTruthy();
      expect(locale.status.ATTENTION_REQUIRED).toBeTruthy();
    },
  );
});

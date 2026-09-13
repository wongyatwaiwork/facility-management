import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { dateOnlyToEndOfDayUtc } from '../../src/lib/calendar-date.js';
import { workOrderCreateSchema } from '../../src/modules/work-orders/schemas.js';

describe('work-order calendar due dates', () => {
  it.each([
    ['winter (CET)', '2026-01-15', '2026-01-15T22:59:59.999Z'],
    ['summer (CEST)', '2026-09-15', '2026-09-15T21:59:59.999Z'],
    ['spring DST transition day', '2026-03-29', '2026-03-29T21:59:59.999Z'],
  ])('converts a Berlin %s date to its local end of day in UTC', (_label, date, expected) => {
    const dueAt = dateOnlyToEndOfDayUtc(date, 'Europe/Berlin');
    expect(dueAt.toISOString()).toBe(expected);
    expect(DateTime.fromJSDate(dueAt).setZone('Europe/Berlin').toISODate()).toBe(date);
  });

  it.each(['2026-2-03', '2026-02-30', 'not-a-date', '2026-09-15T00:00:00Z'])(
    'rejects malformed API dueDate input: %s',
    (dueDate) => {
      const result = workOrderCreateSchema.safeParse({
        title: 'Test work order',
        description: 'A valid test description',
        type: 'REACTIVE',
        priority: 'MEDIUM',
        siteId: 'site-1',
        dueDate,
      });
      expect(result.success).toBe(false);
    },
  );
});

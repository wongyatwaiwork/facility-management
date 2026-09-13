import { RecurrenceInterval } from '@prisma/client';
import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { calculateNextDue } from '../../src/modules/preventive/recurrence.js';

describe('preventive recurrence', () => {
  it('adds a calendar month instead of a fixed number of milliseconds', () => {
    const current = new Date('2026-01-31T08:00:00.000Z');
    const next = calculateNextDue(current, RecurrenceInterval.MONTHLY, 'Europe/Berlin');
    const local = DateTime.fromJSDate(next, { zone: 'utc' }).setZone('Europe/Berlin');
    expect(local.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-02-28 09:00');
  });

  it('preserves the local hour across the German DST spring boundary', () => {
    const current = new Date('2026-03-28T08:00:00.000Z');
    const next = calculateNextDue(current, RecurrenceInterval.WEEKLY, 'Europe/Berlin');
    const local = DateTime.fromJSDate(next, { zone: 'utc' }).setZone('Europe/Berlin');
    expect(local.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-04-04 09:00');
    expect(next.toISOString()).toBe('2026-04-04T07:00:00.000Z');
  });

  it('rejects invalid IANA timezone names', () => {
    expect(() => calculateNextDue(new Date(), RecurrenceInterval.ANNUAL, 'Not/AZone')).toThrowError(
      expect.objectContaining({ code: 'INVALID_TIMEZONE' }),
    );
  });
});

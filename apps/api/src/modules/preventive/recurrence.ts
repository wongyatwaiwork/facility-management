import { RecurrenceInterval } from '@prisma/client';
import { DateTime } from 'luxon';

import { AppError } from '../../lib/errors.js';

export function calculateNextDue(
  currentDueAt: Date,
  recurrence: RecurrenceInterval,
  timezone: string,
) {
  const local = DateTime.fromJSDate(currentDueAt, { zone: 'utc' }).setZone(timezone);
  if (!local.isValid) throw new AppError(400, 'INVALID_TIMEZONE', 'Timezone is invalid');

  const next =
    recurrence === RecurrenceInterval.WEEKLY
      ? local.plus({ weeks: 1 })
      : recurrence === RecurrenceInterval.MONTHLY
        ? local.plus({ months: 1 })
        : recurrence === RecurrenceInterval.QUARTERLY
          ? local.plus({ months: 3 })
          : local.plus({ years: 1 });

  return next.toUTC().toJSDate();
}

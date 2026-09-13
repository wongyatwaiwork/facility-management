import { DateTime, IANAZone } from 'luxon';

import { AppError } from './errors.js';

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export const isValidDateOnly = (value: string) => {
  if (!dateOnlyPattern.test(value)) return false;
  const parsed = DateTime.fromISO(value, { zone: 'utc' });
  return parsed.isValid && parsed.toISODate() === value;
};

export const dateOnlyToEndOfDayUtc = (date: string, timezone: string) => {
  if (!IANAZone.isValidZone(timezone)) {
    throw new AppError(400, 'INVALID_TIMEZONE', 'Site timezone is invalid');
  }
  if (!isValidDateOnly(date)) {
    throw new AppError(400, 'INVALID_DUE_DATE', 'Due date must be a valid YYYY-MM-DD date');
  }

  return DateTime.fromISO(date, { zone: timezone }).endOf('day').toUTC().toJSDate();
};

import { DateTime } from 'luxon';

import type { Locale } from '../api/types';

export const formatDateTime = (value: string | Date, locale: Locale) =>
  DateTime.fromJSDate(typeof value === 'string' ? new Date(value) : value)
    .setZone('Europe/Berlin')
    .setLocale(locale)
    .toLocaleString(DateTime.DATETIME_MED);

export const formatDate = (value: string | Date, locale: Locale, timezone = 'Europe/Berlin') =>
  DateTime.fromJSDate(typeof value === 'string' ? new Date(value) : value)
    .setZone(timezone)
    .setLocale(locale)
    .toLocaleString(DateTime.DATE_MED);

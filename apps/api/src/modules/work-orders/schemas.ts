import { WorkOrderPriority, WorkOrderStatus, WorkOrderType } from '@prisma/client';
import { z } from 'zod';

import { isValidDateOnly } from '../../lib/calendar-date.js';

export const idParamsSchema = z.object({ id: z.string().min(1) });

export const workOrderCreateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(5).max(5000),
  type: z.nativeEnum(WorkOrderType),
  priority: z.nativeEnum(WorkOrderPriority),
  siteId: z.string().min(1),
  buildingId: z.string().optional(),
  locationId: z.string().optional(),
  assetId: z.string().optional(),
  dueDate: z.string().refine(isValidDateOnly, {
    message: 'Due date must be a valid YYYY-MM-DD date',
  }),
  targetStartAt: z.coerce.date().optional(),
  estimatedMinutes: z.number().int().positive().max(100000).optional(),
});

const optionalQueryEnum = <T extends Record<string, string>>(values: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), z.nativeEnum(values).optional());

export const workOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  siteId: z.string().optional(),
  status: optionalQueryEnum(WorkOrderStatus),
  priority: optionalQueryEnum(WorkOrderPriority),
  type: optionalQueryEnum(WorkOrderType),
  assigneeId: z.string().optional(),
  contractorId: z.string().optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  sort: z.enum(['dueAt', 'priority', 'updatedAt', 'number']).default('dueAt'),
  direction: z.enum(['asc', 'desc']).default('asc'),
  mine: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.enum(['true', 'false']).optional(),
  ),
});

export const assignmentSchema = z
  .object({
    technicianId: z.string().nullable().optional(),
    contractorId: z.string().nullable().optional(),
    version: z.number().int().positive(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((value) => Boolean(value.technicianId) !== Boolean(value.contractorId), {
    message: 'Assign either one technician or one contractor',
  });

export const transitionSchema = z.object({
  toStatus: z.nativeEnum(WorkOrderStatus),
  version: z.number().int().positive(),
  note: z.string().trim().max(1000).optional(),
  completionNotes: z.string().trim().max(5000).optional(),
  actualMinutes: z.number().int().positive().max(100000).optional(),
  cancellationReason: z.string().trim().max(1000).optional(),
});

import { InspectionAnswerType, InspectionResult } from '@prisma/client';
import { z } from 'zod';

export const templateSchema = z.object({
  title: z.string().trim().min(3).max(160),
  purpose: z.string().trim().min(5).max(1000),
  siteId: z.string(),
  assetCategoryId: z.string().optional(),
  reference: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        itemKey: z.string().regex(/^[a-z0-9_-]+$/),
        label: z.string().trim().min(2).max(300),
        answerType: z.nativeEnum(InspectionAnswerType),
        isRequired: z.boolean().default(true),
        guidance: z.string().max(1000).optional(),
      }),
    )
    .min(1)
    .max(100),
});

export const scheduleInspectionSchema = z.object({
  templateVersionId: z.string(),
  siteId: z.string(),
  assetId: z.string().optional(),
  locationId: z.string().optional(),
  inspectorId: z.string(),
  dueAt: z.coerce.date(),
});

export const completeInspectionSchema = z.object({
  version: z.number().int().positive(),
  result: z.nativeEnum(InspectionResult),
  completionNotes: z.string().trim().max(5000).optional(),
  responses: z
    .array(
      z.object({
        itemKey: z.string(),
        answer: z.union([z.string(), z.number(), z.boolean()]),
        notes: z.string().trim().max(1000).optional(),
      }),
    )
    .max(100),
});

export const correctiveSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(5).max(5000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  dueAt: z.coerce.date(),
});

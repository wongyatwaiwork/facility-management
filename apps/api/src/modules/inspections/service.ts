import {
  InspectionAnswerType,
  InspectionStatus,
  Prisma,
  Role,
  WorkOrderStatus,
  WorkOrderType,
} from '@prisma/client';
import type { Request } from 'express';
import type { z } from 'zod';

import { prisma } from '../../db.js';
import { AppError, notFound } from '../../lib/errors.js';
import { siteScopeWhere } from '../auth/authorization.js';
import { makeNumber } from '../work-orders/service.js';
import type { completeInspectionSchema, correctiveSchema } from './schemas.js';

interface SnapshotItem {
  itemKey: string;
  label: string;
  answerType: InspectionAnswerType;
  isRequired: boolean;
  guidance?: string;
}

const isFailure = (type: InspectionAnswerType, answer: string | number | boolean) =>
  (type === InspectionAnswerType.PASS_FAIL_NA && answer === 'FAIL') ||
  (type === InspectionAnswerType.YES_NO && answer === false);

export async function completeInspection(
  request: Request,
  id: string,
  input: z.infer<typeof completeInspectionSchema>,
) {
  const inspection = await prisma.inspection.findFirst({
    where: { id, ...siteScopeWhere(request) },
  });
  if (!inspection) throw notFound('Inspection');
  if (
    inspection.status === InspectionStatus.COMPLETED ||
    inspection.status === InspectionStatus.CANCELLED
  ) {
    throw new AppError(
      409,
      'INSPECTION_IMMUTABLE',
      'Completed or cancelled inspections cannot be changed',
    );
  }
  if (inspection.version !== input.version)
    throw new AppError(409, 'STALE_VERSION', 'The inspection was updated by another user');
  if (
    request.authUser!.role === Role.TECHNICIAN &&
    inspection.inspectorId !== request.authUser!.id
  ) {
    throw new AppError(
      403,
      'INSPECTION_NOT_ASSIGNED',
      'Only the assigned inspector may complete this inspection',
    );
  }

  const items = inspection.checklistSnapshot as unknown as SnapshotItem[];
  const responses = new Map(input.responses.map((entry) => [entry.itemKey, entry]));
  for (const item of items) {
    const response = responses.get(item.itemKey);
    if (item.isRequired && (!response || response.answer === '')) {
      throw new AppError(
        400,
        'REQUIRED_RESPONSE_MISSING',
        'A required checklist response is missing',
        {
          itemKey: item.itemKey,
        },
      );
    }
    if (
      response &&
      item.answerType === InspectionAnswerType.NUMERIC &&
      typeof response.answer !== 'number'
    ) {
      throw new AppError(400, 'INVALID_RESPONSE_TYPE', 'A numeric response is required', {
        itemKey: item.itemKey,
      });
    }
  }

  return prisma.$transaction(async (transaction) => {
    const update = await transaction.inspection.updateMany({
      where: {
        id,
        version: input.version,
        status: { in: [InspectionStatus.SCHEDULED, InspectionStatus.IN_PROGRESS] },
      },
      data: {
        status: InspectionStatus.COMPLETED,
        completedAt: new Date(),
        result: input.result,
        completionNotes: input.completionNotes,
        version: { increment: 1 },
      },
    });
    if (update.count !== 1)
      throw new AppError(409, 'STALE_VERSION', 'The inspection was updated by another user');

    for (const item of items) {
      const responseInput = responses.get(item.itemKey);
      if (!responseInput) continue;
      const response = await transaction.inspectionResponse.create({
        data: {
          inspectionId: id,
          itemKey: item.itemKey,
          labelSnapshot: item.label,
          answerType: item.answerType,
          answer: responseInput.answer,
          notes: responseInput.notes,
        },
      });
      if (isFailure(item.answerType, responseInput.answer)) {
        await transaction.inspectionFinding.create({
          data: {
            inspectionId: id,
            responseId: response.id,
            summary: `${item.label}: ${String(responseInput.answer)}`,
            severity: 'ATTENTION_REQUIRED',
          },
        });
      }
    }
    await transaction.auditLog.create({
      data: {
        actorId: request.authUser!.id,
        siteId: inspection.siteId,
        action: 'INSPECTION_COMPLETED',
        entityType: 'Inspection',
        entityId: id,
        requestId: request.requestId,
        summary: { result: input.result, responseCount: input.responses.length },
      },
    });
    return transaction.inspection.findUniqueOrThrow({
      where: { id },
      include: { responses: true, findings: true },
    });
  });
}

export async function createCorrectiveWork(
  request: Request,
  findingId: string,
  input: z.infer<typeof correctiveSchema>,
) {
  const finding = await prisma.inspectionFinding.findFirst({
    where: { id: findingId, inspection: siteScopeWhere(request) },
    include: { inspection: true },
  });
  if (!finding) throw notFound('InspectionFinding');
  if (finding.correctiveWorkOrderId)
    throw new AppError(409, 'CORRECTIVE_WORK_EXISTS', 'Corrective work already exists');

  return prisma.$transaction(async (transaction) => {
    const workOrder = await transaction.workOrder.create({
      data: {
        number: makeNumber('CW'),
        title: input.title,
        description: input.description,
        type: WorkOrderType.INSPECTION_FOLLOW_UP,
        priority: input.priority,
        status: WorkOrderStatus.OPEN,
        siteId: finding.inspection.siteId,
        assetId: finding.inspection.assetId,
        locationId: finding.inspection.locationId,
        reporterId: request.authUser!.id,
        dueAt: input.dueAt,
      },
    });
    const linked = await transaction.inspectionFinding.updateMany({
      where: { id: findingId, correctiveWorkOrderId: null },
      data: { correctiveWorkOrderId: workOrder.id },
    });
    if (linked.count !== 1)
      throw new AppError(409, 'CORRECTIVE_WORK_EXISTS', 'Corrective work already exists');
    await transaction.workOrderStatusHistory.create({
      data: {
        workOrderId: workOrder.id,
        toStatus: WorkOrderStatus.OPEN,
        actorId: request.authUser!.id,
        note: `Created from inspection finding ${findingId}`,
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: request.authUser!.id,
        siteId: finding.inspection.siteId,
        action: 'CORRECTIVE_WORK_CREATED',
        entityType: 'InspectionFinding',
        entityId: findingId,
        requestId: request.requestId,
        summary: { workOrderId: workOrder.id },
      },
    });
    return workOrder;
  });
}

void Prisma;

import { Prisma, WorkOrderPriority, WorkOrderStatus, WorkOrderType } from '@prisma/client';

import { prisma } from '../../db.js';
import { logger } from '../../lib/logger.js';
import { calculateNextDue } from './recurrence.js';

const occurrenceNumber = (planId: string, date: Date) =>
  `PM-${date.toISOString().slice(0, 10).replaceAll('-', '')}-${planId.slice(-6).toUpperCase()}`;

export async function generateDuePreventiveWork(
  cutoff = new Date(),
  actorId?: string,
  requestId?: string,
) {
  const plans = await prisma.preventiveMaintenancePlan.findMany({
    where: { isActive: true, nextDueAt: { lte: cutoff } },
    orderBy: [{ nextDueAt: 'asc' }, { id: 'asc' }],
  });
  const generated: string[] = [];
  const skipped: string[] = [];

  for (const initialPlan of plans) {
    let dueAt = initialPlan.nextDueAt;
    let occurrences = 0;
    while (dueAt <= cutoff && occurrences < 24) {
      const scheduledFor = dueAt;
      const nextDueAt = calculateNextDue(
        scheduledFor,
        initialPlan.recurrence,
        initialPlan.timezone,
      );
      try {
        const workOrder = await prisma.$transaction(async (transaction) => {
          const created = await transaction.workOrder.create({
            data: {
              number: occurrenceNumber(initialPlan.id, scheduledFor),
              title: initialPlan.title,
              description: initialPlan.instructions,
              type: WorkOrderType.PREVENTIVE,
              priority: WorkOrderPriority.MEDIUM,
              status: initialPlan.defaultAssigneeId
                ? WorkOrderStatus.ASSIGNED
                : WorkOrderStatus.OPEN,
              siteId: initialPlan.siteId,
              assetId: initialPlan.assetId,
              reporterId:
                actorId ?? initialPlan.defaultAssigneeId ?? (await systemActorId(transaction)),
              assignedTechnicianId: initialPlan.defaultAssigneeId,
              dueAt: scheduledFor,
            },
          });
          await transaction.maintenanceOccurrence.create({
            data: { planId: initialPlan.id, scheduledFor, workOrderId: created.id },
          });
          await transaction.preventiveMaintenancePlan.update({
            where: { id: initialPlan.id },
            data: { nextDueAt },
          });
          await transaction.workOrderStatusHistory.create({
            data: {
              workOrderId: created.id,
              toStatus: created.status,
              actorId: actorId ?? created.reporterId,
              note: `Generated from preventive occurrence ${scheduledFor.toISOString()}`,
            },
          });
          await transaction.auditLog.create({
            data: {
              actorId: actorId,
              siteId: initialPlan.siteId,
              action: 'PREVENTIVE_OCCURRENCE_GENERATED',
              entityType: 'MaintenanceOccurrence',
              entityId: created.id,
              requestId,
              summary: { planId: initialPlan.id, scheduledFor: scheduledFor.toISOString() },
            },
          });
          return created;
        });
        generated.push(workOrder.id);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          skipped.push(`${initialPlan.id}:${scheduledFor.toISOString()}`);
        } else {
          throw error;
        }
      }
      dueAt = nextDueAt;
      occurrences += 1;
    }
    if (occurrences === 24 && dueAt <= cutoff) {
      logger.warn({ planId: initialPlan.id }, 'Preventive catch-up capped at 24 occurrences');
    }
  }
  return { generated, skipped };
}

async function systemActorId(transaction: Prisma.TransactionClient) {
  const administrator = await transaction.user.findFirst({
    where: { role: 'ADMINISTRATOR', isActive: true },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  if (!administrator)
    throw new Error('An active administrator is required for scheduled generation');
  return administrator.id;
}

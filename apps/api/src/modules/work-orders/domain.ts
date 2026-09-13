import { Role, WorkOrderStatus } from '@prisma/client';

import { AppError } from '../../lib/errors.js';

export const terminalStatuses = new Set<WorkOrderStatus>([
  WorkOrderStatus.CLOSED,
  WorkOrderStatus.CANCELLED,
]);

export const allowedTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  OPEN: [WorkOrderStatus.TRIAGED, WorkOrderStatus.CANCELLED],
  TRIAGED: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.CANCELLED],
  ASSIGNED: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.ON_HOLD, WorkOrderStatus.CANCELLED],
  IN_PROGRESS: [WorkOrderStatus.ON_HOLD, WorkOrderStatus.COMPLETED],
  ON_HOLD: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED],
  COMPLETED: [WorkOrderStatus.VERIFIED],
  VERIFIED: [WorkOrderStatus.CLOSED],
  CLOSED: [],
  CANCELLED: [],
};

const managerRoles = new Set<Role>([Role.ADMINISTRATOR, Role.FACILITY_MANAGER, Role.COORDINATOR]);

export interface TransitionContext {
  from: WorkOrderStatus;
  to: WorkOrderStatus;
  actorRole: Role;
  actorId: string;
  assignedTechnicianId: string | null;
  completedById: string | null;
  completionNotes?: string;
  actualMinutes?: number;
  cancellationReason?: string;
}

export function validateTransition(context: TransitionContext) {
  if (!allowedTransitions[context.from].includes(context.to)) {
    throw new AppError(409, 'INVALID_TRANSITION', 'This status transition is not allowed', {
      from: context.from,
      to: context.to,
    });
  }

  const isAssignedTechnician =
    context.actorRole === Role.TECHNICIAN && context.assignedTechnicianId === context.actorId;
  const technicianTransitions = new Set<WorkOrderStatus>([
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.ON_HOLD,
    WorkOrderStatus.COMPLETED,
  ]);
  if (
    technicianTransitions.has(context.to) &&
    !managerRoles.has(context.actorRole) &&
    !isAssignedTechnician
  ) {
    throw new AppError(403, 'WORK_ORDER_NOT_ASSIGNED', 'Only the assigned technician may act');
  }

  const coordinatingTransitions = new Set<WorkOrderStatus>([
    WorkOrderStatus.TRIAGED,
    WorkOrderStatus.ASSIGNED,
    WorkOrderStatus.CANCELLED,
  ]);
  if (coordinatingTransitions.has(context.to) && !managerRoles.has(context.actorRole)) {
    throw new AppError(403, 'TRANSITION_FORBIDDEN', 'This transition requires a coordinating role');
  }

  if (context.to === WorkOrderStatus.COMPLETED) {
    if (!context.completionNotes?.trim() || !context.actualMinutes || context.actualMinutes < 1) {
      throw new AppError(
        400,
        'COMPLETION_DETAILS_REQUIRED',
        'Completion notes and actual effort are required',
      );
    }
  }

  if (context.to === WorkOrderStatus.VERIFIED) {
    const verifierRoles = new Set<Role>([Role.ADMINISTRATOR, Role.FACILITY_MANAGER]);
    if (!verifierRoles.has(context.actorRole)) {
      throw new AppError(403, 'VERIFICATION_FORBIDDEN', 'Manager verification is required');
    }
    if (context.completedById === context.actorId) {
      throw new AppError(
        409,
        'SELF_VERIFICATION_FORBIDDEN',
        'Completers cannot verify their own work',
      );
    }
  }

  if (context.to === WorkOrderStatus.CLOSED && !managerRoles.has(context.actorRole)) {
    throw new AppError(403, 'CLOSE_FORBIDDEN', 'A coordinating role is required to close work');
  }

  if (context.to === WorkOrderStatus.CANCELLED && !context.cancellationReason?.trim()) {
    throw new AppError(400, 'CANCELLATION_REASON_REQUIRED', 'A cancellation reason is required');
  }
}

export const isOverdue = (status: WorkOrderStatus, dueAt: Date, now = new Date()) =>
  dueAt < now &&
  !terminalStatuses.has(status) &&
  status !== WorkOrderStatus.COMPLETED &&
  status !== WorkOrderStatus.VERIFIED;

import { Role, WorkOrderStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { AppError } from '../../src/lib/errors.js';
import { isOverdue, validateTransition } from '../../src/modules/work-orders/domain.js';

const base = {
  from: WorkOrderStatus.IN_PROGRESS,
  to: WorkOrderStatus.COMPLETED,
  actorRole: Role.TECHNICIAN,
  actorId: 'tech-1',
  assignedTechnicianId: 'tech-1',
  completedById: null,
  completionNotes: 'Replaced the worn belt and ran a functional check.',
  actualMinutes: 75,
};

describe('work-order state machine', () => {
  it('allows an assigned technician to complete work with required evidence', () => {
    expect(() => validateTransition(base)).not.toThrow();
  });

  it('rejects skipping directly from OPEN to COMPLETED', () => {
    expect(() => validateTransition({ ...base, from: WorkOrderStatus.OPEN })).toThrowError(
      expect.objectContaining({ code: 'INVALID_TRANSITION' }),
    );
  });

  it('requires completion notes and actual effort', () => {
    expect(() =>
      validateTransition({ ...base, completionNotes: '', actualMinutes: undefined }),
    ).toThrowError(expect.objectContaining({ code: 'COMPLETION_DETAILS_REQUIRED' }));
  });

  it('prevents the completer from verifying their own work', () => {
    const action = () =>
      validateTransition({
        ...base,
        from: WorkOrderStatus.COMPLETED,
        to: WorkOrderStatus.VERIFIED,
        actorRole: Role.FACILITY_MANAGER,
        actorId: 'manager-1',
        completedById: 'manager-1',
      });
    expect(action).toThrowError(expect.objectContaining({ code: 'SELF_VERIFICATION_FORBIDDEN' }));
  });

  it('derives overdue only for non-terminal work', () => {
    const yesterday = new Date('2026-01-01T00:00:00Z');
    const now = new Date('2026-01-02T00:00:00Z');
    expect(isOverdue(WorkOrderStatus.IN_PROGRESS, yesterday, now)).toBe(true);
    expect(isOverdue(WorkOrderStatus.COMPLETED, yesterday, now)).toBe(false);
    expect(isOverdue(WorkOrderStatus.CANCELLED, yesterday, now)).toBe(false);
  });

  it('uses stable domain error codes', () => {
    try {
      validateTransition({ ...base, from: WorkOrderStatus.CLOSED });
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).status).toBe(409);
    }
  });
});

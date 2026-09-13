import {
  AssetCriticality,
  AssetStatus,
  InspectionAnswerType,
  InspectionResult,
  InspectionStatus,
  PrismaClient,
  RecurrenceInterval,
  Role,
  ThemePreference,
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DateTime } from 'luxon';

import { dateOnlyToEndOfDayUtc } from '../src/lib/calendar-date.js';

const prisma = new PrismaClient();

const ids = {
  berlin: 'site_berlin_demo',
  hamburg: 'site_hamburg_demo',
  frankfurt: 'site_frankfurt_demo',
  berlinBuilding: 'building_berlin_ops_demo',
  hamburgBuilding: 'building_hamburg_service_demo',
  frankfurtBuilding: 'building_frankfurt_office_demo',
  berlinPlant: 'location_berlin_plant_demo',
  berlinOffice: 'location_berlin_office_demo',
  hamburgWorkshop: 'location_hamburg_workshop_demo',
  frankfurtRoof: 'location_frankfurt_roof_demo',
  hvac: 'category_hvac_demo',
  electrical: 'category_electrical_demo',
  safety: 'category_safety_demo',
  ahu: 'asset_berlin_ahu_demo',
  generator: 'asset_berlin_generator_demo',
  lift: 'asset_hamburg_lift_demo',
  heatPump: 'asset_frankfurt_heatpump_demo',
  admin: 'user_admin_demo',
  manager: 'user_manager_demo',
  coordinator: 'user_coordinator_demo',
  techBerlin: 'user_tech_berlin_demo',
  techHamburg: 'user_tech_hamburg_demo',
  auditor: 'user_auditor_demo',
  contractorActive: 'contractor_active_demo',
  contractorInactive: 'contractor_inactive_demo',
  woOpen: 'work_order_open_demo',
  woAssigned: 'work_order_assigned_demo',
  woProgress: 'work_order_progress_demo',
  woCompleted: 'work_order_completed_demo',
  woVerified: 'work_order_verified_demo',
  planAhu: 'plan_ahu_demo',
  planLift: 'plan_lift_demo',
  template: 'inspection_template_demo',
  templateVersion: 'inspection_template_v1_demo',
  inspectionDue: 'inspection_due_demo',
  inspectionCompleted: 'inspection_completed_demo',
} as const;

const atDay = (days: number, hour = 8) => {
  const date = new Date();
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

const atLocalEndOfDay = (days: number, timezone = 'Europe/Berlin') => {
  const date = DateTime.now().setZone(timezone).plus({ days }).toISODate();
  if (!date) throw new Error(`Could not calculate a seed date for timezone ${timezone}`);
  return dateOnlyToEndOfDayUtc(date, timezone);
};

async function resetDemoData() {
  await prisma.documentMetadata.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.inspectionFinding.deleteMany();
  await prisma.inspectionResponse.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.inspectionTemplateItem.deleteMany();
  await prisma.inspectionTemplateVersion.deleteMany();
  await prisma.inspectionTemplate.deleteMany();
  await prisma.maintenanceOccurrence.deleteMany();
  await prisma.workOrderStatusHistory.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.preventiveMaintenancePlan.deleteMany();
  await prisma.contractorSite.deleteMany();
  await prisma.contractor.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.location.deleteMany();
  await prisma.building.deleteMany();
  await prisma.assetCategory.deleteMany();
  await prisma.userSiteAccess.deleteMany();
  await prisma.session.deleteMany();
  await prisma.site.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await resetDemoData();
  const passwordHash = await bcrypt.hash('Demo!2026', 12);

  await prisma.site.createMany({
    data: [
      {
        id: ids.berlin,
        code: 'BER',
        name: 'Berlin Operations Campus',
        city: 'Berlin',
        region: 'Berlin',
      },
      {
        id: ids.hamburg,
        code: 'HAM',
        name: 'Hamburg Service Centre',
        city: 'Hamburg',
        region: 'Hamburg',
      },
      {
        id: ids.frankfurt,
        code: 'FRA',
        name: 'Frankfurt Office Complex',
        city: 'Frankfurt am Main',
        region: 'Hesse',
      },
    ],
  });

  await prisma.user.createMany({
    data: [
      {
        id: ids.admin,
        email: 'admin@example.com',
        name: 'Alex Admin (Demo)',
        passwordHash,
        role: Role.ADMINISTRATOR,
      },
      {
        id: ids.manager,
        email: 'manager@example.com',
        name: 'Mara Manager (Demo)',
        passwordHash,
        role: Role.FACILITY_MANAGER,
        locale: 'en',
        theme: ThemePreference.SYSTEM,
      },
      {
        id: ids.coordinator,
        email: 'coordinator@example.com',
        name: 'Chris Coordinator (Demo)',
        passwordHash,
        role: Role.COORDINATOR,
      },
      {
        id: ids.techBerlin,
        email: 'technician@example.com',
        name: 'Toni Technician (Demo)',
        passwordHash,
        role: Role.TECHNICIAN,
        locale: 'de-DE',
      },
      {
        id: ids.techHamburg,
        email: 'technician.hamburg@example.com',
        name: 'Hanna Technician (Demo)',
        passwordHash,
        role: Role.TECHNICIAN,
      },
      {
        id: ids.auditor,
        email: 'auditor@example.com',
        name: 'Robin Auditor (Demo)',
        passwordHash,
        role: Role.AUDITOR,
        locale: 'zh-HK',
      },
    ],
  });

  await prisma.userSiteAccess.createMany({
    data: [
      { userId: ids.manager, siteId: ids.berlin },
      { userId: ids.manager, siteId: ids.hamburg },
      { userId: ids.manager, siteId: ids.frankfurt },
      { userId: ids.coordinator, siteId: ids.berlin },
      { userId: ids.coordinator, siteId: ids.hamburg },
      { userId: ids.techBerlin, siteId: ids.berlin },
      { userId: ids.techHamburg, siteId: ids.hamburg },
      { userId: ids.auditor, siteId: ids.berlin },
      { userId: ids.auditor, siteId: ids.hamburg },
    ],
  });

  await prisma.building.createMany({
    data: [
      { id: ids.berlinBuilding, siteId: ids.berlin, code: 'BER-B01', name: 'Operations Building' },
      { id: ids.hamburgBuilding, siteId: ids.hamburg, code: 'HAM-B01', name: 'Service Hall' },
      {
        id: ids.frankfurtBuilding,
        siteId: ids.frankfurt,
        code: 'FRA-B01',
        name: 'Office Building',
      },
    ],
  });

  await prisma.location.createMany({
    data: [
      {
        id: ids.berlinPlant,
        siteId: ids.berlin,
        buildingId: ids.berlinBuilding,
        code: 'BER-PLANT',
        name: 'Plant Room',
        kind: 'ROOM',
        floor: 'B1',
      },
      {
        id: ids.berlinOffice,
        siteId: ids.berlin,
        buildingId: ids.berlinBuilding,
        code: 'BER-OFFICE',
        name: 'Office Zone',
        kind: 'ZONE',
        floor: '02',
      },
      {
        id: ids.hamburgWorkshop,
        siteId: ids.hamburg,
        buildingId: ids.hamburgBuilding,
        code: 'HAM-WORK',
        name: 'Main Workshop',
        kind: 'ZONE',
        floor: 'G',
      },
      {
        id: ids.frankfurtRoof,
        siteId: ids.frankfurt,
        buildingId: ids.frankfurtBuilding,
        code: 'FRA-ROOF',
        name: 'Roof Plant Area',
        kind: 'ZONE',
        floor: 'R',
      },
    ],
  });

  await prisma.assetCategory.createMany({
    data: [
      { id: ids.hvac, code: 'HVAC', name: 'Heating, ventilation and air conditioning' },
      { id: ids.electrical, code: 'ELEC', name: 'Electrical systems' },
      { id: ids.safety, code: 'SAFE', name: 'Safety equipment' },
    ],
  });

  await prisma.asset.createMany({
    data: [
      {
        id: ids.ahu,
        internalCode: 'BER-AHU-001',
        name: 'Air handling unit 1',
        siteId: ids.berlin,
        buildingId: ids.berlinBuilding,
        locationId: ids.berlinPlant,
        categoryId: ids.hvac,
        manufacturer: 'DemoVent',
        model: 'DV-400',
        status: AssetStatus.DEGRADED,
        criticality: AssetCriticality.HIGH,
        responsibleTeam: 'Building Services',
        tags: ['ventilation', 'demo'],
      },
      {
        id: ids.generator,
        internalCode: 'BER-GEN-001',
        name: 'Emergency generator',
        siteId: ids.berlin,
        buildingId: ids.berlinBuilding,
        locationId: ids.berlinPlant,
        categoryId: ids.electrical,
        manufacturer: 'Example Power',
        model: 'EP-80',
        status: AssetStatus.OPERATIONAL,
        criticality: AssetCriticality.CRITICAL,
        responsibleTeam: 'Electrical',
        tags: ['backup', 'demo'],
      },
      {
        id: ids.lift,
        internalCode: 'HAM-LIFT-001',
        name: 'Workshop goods lift',
        siteId: ids.hamburg,
        buildingId: ids.hamburgBuilding,
        locationId: ids.hamburgWorkshop,
        categoryId: ids.safety,
        manufacturer: 'Muster Lift',
        model: 'ML-20',
        status: AssetStatus.OPERATIONAL,
        criticality: AssetCriticality.HIGH,
        responsibleTeam: 'Site Operations',
        tags: ['lift', 'demo'],
      },
      {
        id: ids.heatPump,
        internalCode: 'FRA-HP-001',
        name: 'Roof heat pump',
        siteId: ids.frankfurt,
        buildingId: ids.frankfurtBuilding,
        locationId: ids.frankfurtRoof,
        categoryId: ids.hvac,
        status: AssetStatus.OPERATIONAL,
        criticality: AssetCriticality.MEDIUM,
        responsibleTeam: 'Building Services',
        tags: ['heating', 'demo'],
      },
    ],
  });

  await prisma.contractor.createMany({
    data: [
      {
        id: ids.contractorActive,
        companyName: 'Beispiel Technical Services (Demo)',
        email: 'service@example.com',
        phone: '+49 000 000000',
        serviceCategories: ['HVAC', 'Electrical'],
        isActive: true,
        approvedForDemo: true,
        notes: 'Fictional contractor record for portfolio demonstration.',
      },
      {
        id: ids.contractorInactive,
        companyName: 'Archived Lift Partner (Demo)',
        email: 'archived@example.com',
        serviceCategories: ['Lift'],
        isActive: false,
        approvedForDemo: false,
        notes: 'Inactive fictional record used to demonstrate assignment controls.',
      },
    ],
  });
  await prisma.contractorSite.createMany({
    data: [
      { contractorId: ids.contractorActive, siteId: ids.berlin },
      { contractorId: ids.contractorActive, siteId: ids.hamburg },
      { contractorId: ids.contractorInactive, siteId: ids.hamburg },
    ],
  });

  await prisma.workOrder.createMany({
    data: [
      {
        id: ids.woOpen,
        number: 'WO-DEMO-1001',
        title: 'Investigate AHU vibration',
        description: 'Unusual vibration reported during the morning walk-through.',
        type: WorkOrderType.REACTIVE,
        priority: WorkOrderPriority.HIGH,
        status: WorkOrderStatus.OPEN,
        siteId: ids.berlin,
        buildingId: ids.berlinBuilding,
        locationId: ids.berlinPlant,
        assetId: ids.ahu,
        reporterId: ids.coordinator,
        dueAt: atLocalEndOfDay(-2),
      },
      {
        id: ids.woAssigned,
        number: 'WO-DEMO-1002',
        title: 'Replace generator starter battery',
        description: 'Planned replacement based on internal maintenance instructions.',
        type: WorkOrderType.PREVENTIVE,
        priority: WorkOrderPriority.HIGH,
        status: WorkOrderStatus.ASSIGNED,
        siteId: ids.berlin,
        buildingId: ids.berlinBuilding,
        locationId: ids.berlinPlant,
        assetId: ids.generator,
        reporterId: ids.manager,
        assignedTechnicianId: ids.techBerlin,
        dueAt: atLocalEndOfDay(2),
        estimatedMinutes: 90,
      },
      {
        id: ids.woProgress,
        number: 'WO-DEMO-1003',
        title: 'Check workshop lift door sensor',
        description: 'Intermittent door sensor warning requires diagnosis.',
        type: WorkOrderType.REACTIVE,
        priority: WorkOrderPriority.URGENT,
        status: WorkOrderStatus.IN_PROGRESS,
        siteId: ids.hamburg,
        buildingId: ids.hamburgBuilding,
        locationId: ids.hamburgWorkshop,
        assetId: ids.lift,
        reporterId: ids.coordinator,
        assignedTechnicianId: ids.techHamburg,
        dueAt: atLocalEndOfDay(0),
        actualStartAt: atDay(0, 7),
      },
      {
        id: ids.woCompleted,
        number: 'WO-DEMO-1004',
        title: 'Clean AHU intake filters',
        description: 'Routine filter cleaning and condition check.',
        type: WorkOrderType.PREVENTIVE,
        priority: WorkOrderPriority.MEDIUM,
        status: WorkOrderStatus.COMPLETED,
        siteId: ids.berlin,
        buildingId: ids.berlinBuilding,
        locationId: ids.berlinPlant,
        assetId: ids.ahu,
        reporterId: ids.manager,
        assignedTechnicianId: ids.techBerlin,
        completedById: ids.techBerlin,
        dueAt: atLocalEndOfDay(-1),
        completedAt: atDay(-1, 13),
        actualMinutes: 55,
        completionNotes: 'Filters cleaned; one frame marked for monitoring.',
      },
      {
        id: ids.woVerified,
        number: 'WO-DEMO-1005',
        title: 'Inspect heat pump isolation labels',
        description: 'Confirm labels are legible and record the result.',
        type: WorkOrderType.OTHER,
        priority: WorkOrderPriority.LOW,
        status: WorkOrderStatus.VERIFIED,
        siteId: ids.frankfurt,
        buildingId: ids.frankfurtBuilding,
        locationId: ids.frankfurtRoof,
        assetId: ids.heatPump,
        reporterId: ids.manager,
        assignedTechnicianId: ids.techBerlin,
        completedById: ids.techBerlin,
        verifiedById: ids.manager,
        dueAt: atLocalEndOfDay(-5),
        completedAt: atDay(-6),
        verifiedAt: atDay(-5),
        actualMinutes: 20,
        completionNotes: 'Labels present and legible.',
      },
    ],
  });

  for (const item of [
    [ids.woOpen, WorkOrderStatus.OPEN, ids.coordinator],
    [ids.woAssigned, WorkOrderStatus.ASSIGNED, ids.manager],
    [ids.woProgress, WorkOrderStatus.IN_PROGRESS, ids.techHamburg],
    [ids.woCompleted, WorkOrderStatus.COMPLETED, ids.techBerlin],
    [ids.woVerified, WorkOrderStatus.VERIFIED, ids.manager],
  ] as const) {
    await prisma.workOrderStatusHistory.create({
      data: {
        workOrderId: item[0],
        toStatus: item[1],
        actorId: item[2],
        note: 'Fictional seeded history',
      },
    });
  }

  await prisma.preventiveMaintenancePlan.createMany({
    data: [
      {
        id: ids.planAhu,
        title: 'Quarterly AHU filter service',
        instructions: 'Inspect filters, clean housing, and record condition.',
        siteId: ids.berlin,
        assetId: ids.ahu,
        defaultAssigneeId: ids.techBerlin,
        recurrence: RecurrenceInterval.QUARTERLY,
        timezone: 'Europe/Berlin',
        nextDueAt: atDay(-1),
        leadDays: 7,
        procedureReference: 'Internal demo procedure MFO-HVAC-01',
      },
      {
        id: ids.planLift,
        title: 'Monthly lift functional check',
        instructions:
          'Perform the fictional internal operational checklist; this is not a certified inspection.',
        siteId: ids.hamburg,
        assetId: ids.lift,
        defaultAssigneeId: ids.techHamburg,
        recurrence: RecurrenceInterval.MONTHLY,
        timezone: 'Europe/Berlin',
        nextDueAt: atDay(14),
        leadDays: 5,
        procedureReference: 'Configurable demo reference only',
      },
    ],
  });

  await prisma.inspectionTemplate.create({
    data: {
      id: ids.template,
      title: 'Air handling unit operational check',
      purpose: 'Record a repeatable internal equipment condition check for the portfolio demo.',
      siteId: ids.berlin,
      assetCategoryId: ids.hvac,
      versions: {
        create: {
          id: ids.templateVersion,
          version: 1,
          reference: 'Internal demo checklist; not a legal or certified standard.',
          items: {
            create: [
              {
                itemKey: 'guards',
                position: 1,
                label: 'Guards and access panels secure',
                answerType: InspectionAnswerType.PASS_FAIL_NA,
                isRequired: true,
              },
              {
                itemKey: 'noise',
                position: 2,
                label: 'Unusual noise or vibration absent',
                answerType: InspectionAnswerType.YES_NO,
                isRequired: true,
              },
              {
                itemKey: 'pressure',
                position: 3,
                label: 'Filter pressure reading (Pa)',
                answerType: InspectionAnswerType.NUMERIC,
                isRequired: true,
              },
              {
                itemKey: 'notes',
                position: 4,
                label: 'Additional observations',
                answerType: InspectionAnswerType.TEXT,
                isRequired: false,
              },
            ],
          },
        },
      },
    },
  });

  const snapshot = [
    {
      itemKey: 'guards',
      label: 'Guards and access panels secure',
      answerType: 'PASS_FAIL_NA',
      isRequired: true,
    },
    {
      itemKey: 'noise',
      label: 'Unusual noise or vibration absent',
      answerType: 'YES_NO',
      isRequired: true,
    },
    {
      itemKey: 'pressure',
      label: 'Filter pressure reading (Pa)',
      answerType: 'NUMERIC',
      isRequired: true,
    },
    { itemKey: 'notes', label: 'Additional observations', answerType: 'TEXT', isRequired: false },
  ];
  await prisma.inspection.createMany({
    data: [
      {
        id: ids.inspectionDue,
        number: 'INSP-DEMO-001',
        siteId: ids.berlin,
        assetId: ids.ahu,
        locationId: ids.berlinPlant,
        templateVersionId: ids.templateVersion,
        checklistSnapshot: snapshot,
        status: InspectionStatus.SCHEDULED,
        dueAt: atDay(1),
        inspectorId: ids.techBerlin,
      },
      {
        id: ids.inspectionCompleted,
        number: 'INSP-DEMO-002',
        siteId: ids.berlin,
        assetId: ids.generator,
        locationId: ids.berlinPlant,
        templateVersionId: ids.templateVersion,
        checklistSnapshot: snapshot,
        status: InspectionStatus.COMPLETED,
        dueAt: atDay(-30),
        inspectorId: ids.techBerlin,
        completedAt: atDay(-30, 11),
        result: InspectionResult.SATISFACTORY,
        completionNotes: 'Fictional historical demo record.',
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorId: ids.manager,
        siteId: ids.berlin,
        action: 'DEMO_DATA_SEEDED',
        entityType: 'Site',
        entityId: ids.berlin,
        summary: { fictional: true },
      },
      {
        actorId: ids.coordinator,
        siteId: ids.berlin,
        action: 'WORK_ORDER_CREATED',
        entityType: 'WorkOrder',
        entityId: ids.woOpen,
        summary: { number: 'WO-DEMO-1001', fictional: true },
      },
      {
        actorId: ids.techBerlin,
        siteId: ids.berlin,
        action: 'WORK_ORDER_COMPLETED',
        entityType: 'WorkOrder',
        entityId: ids.woCompleted,
        summary: { number: 'WO-DEMO-1004', fictional: true },
      },
    ],
  });

  console.log('Seeded fictional Musterwerk Facility Operations demo data.');
  console.log('Demo password for all accounts: Demo!2026');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

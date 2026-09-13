export type Role = 'ADMINISTRATOR' | 'FACILITY_MANAGER' | 'COORDINATOR' | 'TECHNICIAN' | 'AUDITOR';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale?: Locale;
  theme?: ThemePreference;
  siteIds?: string[];
}

export type Locale = 'en' | 'de-DE' | 'zh-HK';
export type ThemePreference = 'SYSTEM' | 'LIGHT' | 'DARK';

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  city: string;
  region: string;
  timezone: string;
  _count?: { buildings: number; assets: number; workOrders: number; inspections: number };
}

export interface Asset {
  id: string;
  internalCode: string;
  name: string;
  manufacturer?: string;
  model?: string;
  status: string;
  criticality: string;
  responsibleTeam: string;
  version: number;
  site: { name: string };
  location: { name: string };
  category: { name: string };
  workOrders?: WorkOrder[];
  preventivePlans?: PreventivePlan[];
  inspections?: Inspection[];
}

export interface WorkOrder {
  id: string;
  number: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  siteId: string;
  dueAt: string;
  version: number;
  actualMinutes?: number;
  completionNotes?: string;
  site: { name: string; timezone?: string };
  asset?: { internalCode: string; name: string };
  assignedTechnician?: { id?: string; name: string };
  contractor?: { id?: string; companyName: string };
  statusHistory?: Array<{
    id: string;
    fromStatus?: string;
    toStatus: string;
    note?: string;
    createdAt: string;
    actor: { name: string };
  }>;
}

export interface PreventivePlan {
  id: string;
  title: string;
  instructions: string;
  recurrence: string;
  timezone: string;
  nextDueAt: string;
  leadDays: number;
  isActive: boolean;
  site: { name: string };
  asset?: { internalCode: string; name: string };
  defaultAssignee?: { id: string; name: string };
  _count?: { occurrences: number };
}

export interface SnapshotItem {
  itemKey: string;
  label: string;
  answerType: 'PASS_FAIL_NA' | 'YES_NO' | 'NUMERIC' | 'TEXT';
  isRequired: boolean;
  guidance?: string;
}

export interface Inspection {
  id: string;
  number: string;
  status: string;
  result?: string;
  dueAt: string;
  version: number;
  checklistSnapshot?: SnapshotItem[];
  site: { name: string };
  asset?: { internalCode: string; name: string };
  inspector: { id: string; name: string };
  templateVersion?: { template: { title: string } };
  _count?: { findings: number };
  findings?: Array<{
    id: string;
    summary: string;
    severity: string;
    correctiveWorkOrder?: WorkOrder;
  }>;
}

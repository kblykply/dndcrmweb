export type Numeric = number | string;
export type Trade = {
  id: string;
  name: string;
  weight: Numeric;
  position: number;
};
export type UnitSummary = {
  id: string;
  projectId: string;
  block: string;
  label: string;
  included: boolean;
  scopeNote: string;
  sourceRef: string;
  progress: number | null;
  quality: number | null;
  done: number;
  checked: number;
  defects: number;
  total: number;
};
export type Entry = {
  id: string;
  status: string;
  quality: string;
  note: string;
  sourceStatus: string;
  checkedAt: string | null;
  version: number;
  updatedAt: string;
  trade: Trade;
};
export type UnitDetail = UnitSummary & {
  project: ProjectBase;
  entries: Entry[];
  canEdit: boolean;
};
export type ProjectBase = {
  id: string;
  name: string;
  crmProject: string;
  notes: string;
};
export type Totals = {
  gross: number;
  adjustment: number;
  base: number;
  tax: number;
  deduction: number;
  net: number;
};
export type ClaimSummary = {
  id: string;
  projectId: string;
  contractor: string;
  number: string;
  period: string;
  currency: string;
  sourceNet: Numeric | null;
  note: string;
} & Totals;
export type Measurement = {
  name: string;
  cells: { address: string; value: string | number; formula?: string }[];
};
export type ClaimLine = {
  id: string;
  code: string;
  name: string;
  unit: string;
  previousQty: Numeric;
  measuredQty: Numeric | null;
  acceptedQty: Numeric;
  unitPrice: Numeric;
  sourceAmount: Numeric | null;
  sourceRef: string | null;
  note: string;
  measurements: Measurement;
};
export type ClaimDetail = {
  id: string;
  projectId: string;
  contractor: string;
  number: string;
  period: string;
  currency: string;
  sourceNet: Numeric | null;
  note: string;
  project: ProjectBase;
  lines: ClaimLine[];
  totals: Totals;
  lockedByNextPeriod?: boolean;
  canEdit: boolean;
  version: number;
  taxRate: Numeric;
  adjustment: Numeric;
  adjustmentNote: string;
  deduction: Numeric;
};
export type BudgetTotals = {
  calculated: number;
  source: number;
  difference: number;
  knownPaid: number;
  paid: number | null;
  paidCoverage: number;
  itemCount: number;
};
export type BudgetSummary = {
  id: string;
  projectId: string;
  name: string;
  currency: string;
  sourceTotal: Numeric | null;
} & BudgetTotals;
export type BudgetItem = {
  id: string;
  category: string;
  position: number;
  name: string;
  unit: string;
  quantity: Numeric;
  unitPrice: Numeric;
  completedQty: Numeric | null;
  paid: Numeric | null;
  sourceAmount: Numeric;
  sourceRef: string;
  sourceFormula: string | null;
  note: string;
  version: number;
  calculated: number;
  remainingQty: number | null;
  remainingBalance: number | null;
};
export type BudgetDetail = {
  id: string;
  projectId: string;
  name: string;
  currency: string;
  sourceTotal: Numeric | null;
  project: ProjectBase;
  items: BudgetItem[];
  totals: BudgetTotals;
  canEdit: boolean;
};
export type Issue = {
  id: string;
  projectId: string;
  area: string;
  severity: string;
  title: string;
  detail: string;
  requiredInfo: string;
  sourceRef: string;
  owner: string;
  status: string;
  resolution: string;
  version: number;
};
export type Source = {
  id: string;
  fileName: string;
  kind: string;
  sha256: string;
  sourceDate: string | null;
  dateBasis: string;
  importedAt: string;
};
export type Project = ProjectBase & {
  sources: Source[];
  trades: Trade[];
  units: UnitSummary[];
  blocks: {
    block: string;
    total: number;
    included: number;
    progress: number | null;
    completed: number;
    checked: number;
    defects: number;
  }[];
  claims: ClaimSummary[];
  budgets: BudgetSummary[];
  issues: Issue[];
  canEdit: boolean;
};
export type Workspace = {
  canEdit: boolean;
  projects: (ProjectBase & {
    unitCount: number;
    includedCount: number;
    progress: number | null;
    claimCount: number;
    latestClaim: ({ number: string } & Totals) | null;
    budgets: BudgetSummary[];
    openIssues: number;
  })[];
};
export type History = {
  items: {
    id: string;
    entityType: string;
    entityId: string;
    actorName: string;
    reason: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    createdAt: string;
  }[];
  nextCursor: string | null;
};

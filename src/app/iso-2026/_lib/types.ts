export type IsoDocument = {
  title: string;
  reference: string;
  status: string;
  language: string;
  sourceFile: string;
  totalPages: number;
  sha256: string;
};

export type IsoClauseMeta = {
  code: string;
  title: string;
  titleTr?: string | null;
  titleIsEditorial?: boolean;
  parentCode?: string | null;
  kind: string;
  sourcePages: number[];
  relatedCodes: string[];
};

export type IsoClause = IsoClauseMeta & { body: string };
export type IsoProcessStatus = "ACTIVE" | "NEEDS_REVIEW" | "ARCHIVED";
export type IsoDocumentStatus =
  | "DRAFT"
  | "ACTIVE"
  | "NEEDS_REVIEW"
  | "ARCHIVED";
export type IsoDocumentType =
  | "PROCEDURE"
  | "POLICY"
  | "FORM"
  | "CHECKLIST"
  | "RECORD"
  | "DRAWING"
  | "CONTRACT"
  | "REPORT"
  | "OTHER";
export type IsoUser = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

export type IsoChecklistItem = {
  id: string;
  title: string;
  description?: string | null;
  required: boolean;
  isChecked: boolean;
  dueAt?: string | null;
  checkedAt?: string | null;
  checkedBy?: IsoUser | null;
  createdBy?: IsoUser | null;
};

export type IsoWorkspaceDocument = {
  id: string;
  title: string;
  type: IsoDocumentType;
  status: IsoDocumentStatus;
  revision?: string | null;
  ownerDepartment?: string | null;
  url?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: IsoUser | null;
  updatedBy?: IsoUser | null;
};

export type IsoLog = {
  id: string;
  action: string;
  note?: string | null;
  createdAt: string;
  createdBy?: IsoUser | null;
};

export type IsoWorkspace = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  category?: string;
  status: IsoProcessStatus;
  ownerDepartment?: string | null;
  color?: string | null;
  sortOrder?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  checklists: IsoChecklistItem[];
  documents: IsoWorkspaceDocument[];
  logs: IsoLog[];
};

export type IsoDetailResponse = {
  document: IsoDocument;
  clause: IsoClause;
  children: IsoClauseMeta[];
  ancestors: IsoClauseMeta[];
  previous: IsoClauseMeta | null;
  next: IsoClauseMeta | null;
  item: IsoWorkspace;
};

export const isoClauseHref = (code: string) =>
  `/iso-2026/${encodeURIComponent(code)}`;

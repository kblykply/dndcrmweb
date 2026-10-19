export type ReportCell = string | number | null;
export type ReportColumn = {
  label: string;
  kind?: "money" | "percent" | "count";
  width?: number;
  pdfWidth?: number;
  pdfHidden?: boolean;
};
export type ReportSheet = {
  name: string;
  columns: ReportColumn[];
  rows: ReportCell[][];
  overdueRows?: number[];
  overdueColumns?: number[];
};
export type FinanceReport = {
  title: string;
  filename: string;
  metadata: string[];
  sheets: ReportSheet[];
  pdf?: { subtitle: string; details: string[]; note: string };
};
export type ReportFormat = "xlsx" | "pdf";

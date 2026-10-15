export type ReportCell = string | number | null;
export type ReportColumn = {
  label: string;
  kind?: "money" | "percent" | "count";
  width?: number;
};
export type ReportSheet = {
  name: string;
  columns: ReportColumn[];
  rows: ReportCell[][];
};
export type FinanceReport = {
  title: string;
  filename: string;
  metadata: string[];
  sheets: ReportSheet[];
};
export type ReportFormat = "xlsx" | "pdf";

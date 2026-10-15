import type {
  PaymentInstallment,
  PaymentProjectGroup,
  PaymentSourceSnapshot,
} from "../payment-tracking/_lib/types";
export type Row = PaymentInstallment & {
  id: string;
  caseKey: string;
  customerCode: string | null;
  customerName: string;
  representatives: string[];
  brokers: string[];
  unitCode: string | null;
  unitName: string;
  currency: string | null;
  projectGroup: PaymentProjectGroup;
};
export type PeriodTotals = {
  count: number;
  amount: number | null;
  paid: number | null;
  outstanding: number | null;
};
export type YearGroup = PeriodTotals & {
  currency: string | null;
  year: string;
  months: (PeriodTotals & { month: string })[];
};
export type InstallmentTableData = {
  previousMonthEnd: string;
  overview: {
    currency: string | null;
    overall: PeriodTotals;
    throughPreviousMonth: PeriodTotals;
    undated: PeriodTotals;
  }[];
  year: string;
  month: string;
  years: YearGroup[];
  source: Omit<PaymentSourceSnapshot, "cases">;
  currency: string;
  search: string;
  status: string;
  sort: string;
  direction: string;
  currencies: (string | null)[];
  rows: Row[];
  total: number;
  page: number;
  totalPages: number;
  totals: {
    amount: number | null;
    paid: number | null;
    outstanding: number | null;
  };
};

export interface WalletSummary {
  balance: number;
  budget: number;
  spent: number;
  savings: number;
  monthlyIncome: number;
}

export interface BudgetCategory {
  name: string;
  icon: string;
  accent: string;
  spent: number;
  limit: number;
  trend: string;
}

export interface TransactionEntry {
  concept: string;
  category: string;
  date: string;
  amount: number;
  note: string;
}

export interface TimelineEntry {
  label: string;
  income: number;
  expense: number;
}

export interface ScreenPreview {
  title: string;
  route: string;
  description: string;
  accent: string;
}

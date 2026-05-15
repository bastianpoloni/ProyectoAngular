export interface User {
  id: string;
  nombre: string;
  saldo: number;
  presupuesto?: number;
}

export interface WalletSummary {
  balance: number;
  budget: number;
  spent: number;
  savings: number;
  monthlyIncome: number;
}

export interface BudgetCategory {
  id: string;
  color: string;
  esIngreso: boolean;
  icono: string;
  nombre: string;
  porcentajeLimite: number;
  limiteMonto?: number;
  spent?: number; // calculated
  trend?: string; // calculated
}

export interface TransactionEntry {
  id?: string;
  categoriaNombre: string;
  descripcion: string;
  monto: number;
  esIngreso: boolean;
  fecha: Date;
}

export interface TimelineEntry {
  label: string;
  income: number;
  expense: number;
  incomePercent?: number;
  expensePercent?: number;
}

export interface ScreenPreview {
  title: string;
  route: string;
  description: string;
  accent: string;
}

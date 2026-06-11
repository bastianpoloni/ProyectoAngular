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

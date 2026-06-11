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

export interface User {
  id: string;
  nombre: string;
  presupuesto: number;
  saldo?: number;
}

export interface WalletSummary {
  balance: number;
  budget: number;
  spent: number;
  savings: number;
}

export interface User {
  id: string;
  nombre: string;
  saldo: number;
  presupuesto?: number;
  ingresoMensual?: number;
  notificaciones?: boolean;
}

export interface WalletSummary {
  balance: number;
  budget: number;
  spent: number;
  savings: number;
  monthlyIncome: number;
}

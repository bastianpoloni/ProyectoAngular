export interface CategoriaPresupuesto {
  id: string;
  color: string;
  esIngreso: boolean;
  icono: string;
  nombre: string;
  porcentajeLimite: number;
  limiteMonto?: number;
  spent?: number;
  trend?: string;
}

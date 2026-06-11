export interface Transaccion {
  id?: string;
  categoriaNombre: string;
  descripcion: string;
  monto: number;
  esIngreso: boolean;
  fecha: Date;
}

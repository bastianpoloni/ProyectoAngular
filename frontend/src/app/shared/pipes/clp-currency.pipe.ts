import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'clpCurrency',
  standalone: true
})
export class ClpCurrencyPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value == null || isNaN(value)) {
      return '$0';
    }

    // El Peso Chileno no suele usar decimales, por lo que los forzamos a 0
    const formatted = new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);

    return formatted;
  }
}

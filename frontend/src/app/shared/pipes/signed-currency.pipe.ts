import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'signedCurrency',
  standalone: true
})
export class SignedCurrencyPipe implements PipeTransform {
  transform(value: number, prefix = '$'): string {
    const absoluteValue = Math.abs(value);
    const formatted = new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(absoluteValue);

    if (value > 0) {
      return `+${prefix}${formatted}`;
    }

    if (value < 0) {
      return `-${prefix}${formatted}`;
    }

    return `${prefix}${formatted}`;
  }
}

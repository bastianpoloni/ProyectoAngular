import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ClpCurrencyPipe } from '../../../../../../shared/pipes/clp-currency.pipe';
import { Dashboard } from '../../../../services/dashboard.service';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [RouterLink, ClpCurrencyPipe],
  templateUrl: './detalle.component.html',
  styleUrl: './detalle.component.css'
})
export class DetailComponent {
  private readonly svc = inject(Dashboard);

  protected readonly categories = this.svc.categories;
  protected readonly summary = this.svc.summary;
  protected readonly transactions = this.svc.transactions;

  protected readonly categoriesWithSpent = computed(() => {
    const cats = this.categories();
    const txs = this.transactions();
    const budget = this.summary().budget || 1;
    
    return cats.map(c => {
      const spent = txs
        .filter(t => !t.esIngreso && t.categoriaNombre === c.nombre)
        .reduce((sum, t) => sum + Math.abs(t.monto), 0);
      const percentage = (spent / budget) * 100;
      return { ...c, spent, percentageStr: percentage.toFixed(1) };
    });
  });

  protected readonly donutGradient = computed(() => {
    const cats = this.categoriesWithSpent();
    const budget = this.summary().budget || 1;

    let currentPercent = 0;
    const slices: string[] = [];

    cats.forEach(c => {
      if (c.spent > 0) {
        const percent = (c.spent / budget) * 100;
        const nextPercent = Math.min(currentPercent + percent, 100);
        slices.push(`${c.color} ${currentPercent.toFixed(1)}% ${nextPercent.toFixed(1)}%`);
        currentPercent = nextPercent;
      }
    });

    if (currentPercent < 100) {
      slices.push(`#dfe8ed ${currentPercent.toFixed(1)}% 100%`);
    }

    return `conic-gradient(${slices.join(', ')})`;
  });

  protected readonly savings = computed(() => {
    const budget = this.summary().budget || 0;
    const cats = this.categoriesWithSpent();
    const spent = cats.reduce((sum, c) => sum + c.spent, 0);
    return Math.max(0, budget - spent);
  });

  protected readonly savingsPercentageStr = computed(() => {
    const budget = this.summary().budget || 1;
    const sav = this.savings();
    return ((sav / budget) * 100).toFixed(1);
  });
}

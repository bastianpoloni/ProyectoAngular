import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ClpCurrencyPipe } from '../../../../shared/pipes/clp-currency.pipe';
import { Historial } from '../../services/historial';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [RouterLink, ClpCurrencyPipe, DatePipe],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css'
})
export class HistoryComponent {
  private readonly svc = inject(Historial);

  protected readonly timeline = this.svc.timeline;
  protected readonly mode = this.svc.mode;
  protected readonly selectedCategory = this.svc.selectedCategory;
  protected readonly categories = this.svc.categories;
  protected readonly transactions = this.svc.transactions;

  setMode(mode: 'Temporal' | 'Categoría'): void {
    this.svc.setMode(mode);
  }

  selectCategory(category: string): void {
    this.svc.selectCategory(category);
  }
}

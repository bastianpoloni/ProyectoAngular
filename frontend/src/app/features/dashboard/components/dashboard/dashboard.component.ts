import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ClpCurrencyPipe } from '../../../../shared/pipes/clp-currency.pipe';
import { Dashboard } from '../../services/dashboard.service';
import { DetailComponent } from '../detalle/components/detalle/detalle.component';
import { AddExpenseModalComponent } from '../add-expense-modal/add-expense-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, ClpCurrencyPipe, DatePipe, DetailComponent, AddExpenseModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private readonly svc = inject(Dashboard);

  protected readonly summary = this.svc.summary;
  protected readonly transactions = this.svc.transactions;
  protected readonly categories = this.svc.topCategories;
  protected readonly savingsRate = this.svc.savingsRate;

  protected readonly isAddExpenseOpen = signal(false);

  protected openAddExpenseModal(): void {
    this.isAddExpenseOpen.set(true);
  }

  protected closeAddExpenseModal(): void {
    this.isAddExpenseOpen.set(false);
  }
}

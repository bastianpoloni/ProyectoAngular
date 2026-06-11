import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ClpCurrencyPipe } from '../../../../shared/pipes/clp-currency.pipe';
import { Dashboard } from '../../services/dashboard';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, ClpCurrencyPipe, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private readonly svc = inject(Dashboard);

  protected readonly summary = this.svc.summary;
  protected readonly transactions = this.svc.transactions;
  protected readonly categories = this.svc.topCategories;
  protected readonly savingsRate = this.svc.savingsRate;
}

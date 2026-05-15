import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ClpCurrencyPipe } from '../../../../shared/pipes/clp-currency.pipe';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, ClpCurrencyPipe, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private readonly svc = inject(DashboardService);

  protected readonly summary = this.svc.summary;
  protected readonly transactions = this.svc.transactions;
  protected readonly categories = this.svc.topCategories;
  protected readonly previews = this.svc.previews;
  protected readonly savingsRate = this.svc.savingsRate;
}

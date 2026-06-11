import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ClpCurrencyPipe } from '../../../../shared/pipes/clp-currency.pipe';
import { Detalle } from '../../services/detalle';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [RouterLink, ClpCurrencyPipe, DatePipe],
  templateUrl: './detalle.component.html',
  styleUrl: './detalle.component.css'
})
export class DetailComponent {
  private readonly svc = inject(Detalle);

  protected readonly categories = this.svc.categories;
  protected readonly summary = this.svc.summary;
  protected readonly transactions = this.svc.transactions;
}

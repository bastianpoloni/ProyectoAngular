import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SignedCurrencyPipe } from '../../../../shared/pipes/signed-currency.pipe';
import { DetailService } from '../../services/detalle.service';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [RouterLink, SignedCurrencyPipe],
  templateUrl: './detalle.component.html',
  styleUrl: './detalle.component.css'
})
export class DetailComponent {
  private readonly svc = inject(DetailService);

  protected readonly categories = this.svc.categories;
  protected readonly summary = this.svc.summary;
  protected readonly transactions = this.svc.transactions;
}

import { Injectable } from '@angular/core';

import { BilleteraService } from '../../../shared/services/billetera.service';

@Injectable({ providedIn: 'root' })
export class DetailService {
  constructor(private readonly wallet: BilleteraService) {}

  get categories() {
    return this.wallet.categories;
  }

  get summary() {
    return this.wallet.summary;
  }

  get transactions() {
    return this.wallet.transactions;
  }
}

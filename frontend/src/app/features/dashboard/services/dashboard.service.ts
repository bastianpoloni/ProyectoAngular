import { Injectable } from '@angular/core';

import { BilleteraService } from '../../../shared/services/billetera.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private readonly wallet: BilleteraService) {}

  get summary() {
    return this.wallet.summary;
  }

  get transactions() {
    return this.wallet.transactions;
  }

  get topCategories() {
    return this.wallet.topCategories;
  }

  get previews() {
    return this.wallet.previews;
  }

  get savingsRate() {
    return this.wallet.savingsRate;
  }
}

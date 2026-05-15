import { Injectable } from '@angular/core';

import { BilleteraService } from '../../../shared/services/billetera.service';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  constructor(private readonly wallet: BilleteraService) {}

  get timeline() {
    return this.wallet.timeline;
  }

  get mode() {
    return this.wallet.historyMode;
  }

  get selectedCategory() {
    return this.wallet.selectedCategory;
  }

  get categories() {
    return this.wallet.categoryOptions;
  }

  get transactions() {
    return this.wallet.filteredTransactions;
  }

  setMode(mode: 'Temporal' | 'Categoría'): void {
    this.wallet.setHistoryMode(mode);
  }

  selectCategory(category: string): void {
    this.wallet.setSelectedCategory(category);
  }
}

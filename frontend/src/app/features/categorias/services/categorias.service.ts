import { Injectable } from '@angular/core';

import { BilleteraService } from '../../../shared/services/billetera.service';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  constructor(private readonly wallet: BilleteraService) {}

  get categories() {
    return this.wallet.categories;
  }

  get selectedCategory() {
    return this.wallet.selectedCategory;
  }

  get selectedCategoryData() {
    return this.wallet.selectedCategoryData;
  }

  get transactions() {
    return this.wallet.filteredTransactions;
  }

  get allTransactions() {
    return this.wallet.transactions;
  }

  get summary() {
    return this.wallet.summary();
  }

  selectCategory(category: string): void {
    this.wallet.setSelectedCategory(category);
  }

  addTransaction(transaction: any) {
    return this.wallet.addTransaction(transaction);
  }

  addCategory(category: any) {
    return this.wallet.addCategory(category);
  }

  updateBalance(amount: number) {
    return this.wallet.updateBalance(amount);
  }
}

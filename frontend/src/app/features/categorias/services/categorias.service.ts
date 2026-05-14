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

  selectCategory(category: string): void {
    this.wallet.setSelectedCategory(category);
  }
}

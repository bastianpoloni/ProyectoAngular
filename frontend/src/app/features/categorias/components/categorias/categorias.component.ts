import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { SignedCurrencyPipe } from '../../../../shared/pipes/signed-currency.pipe';
import { CategoriesService } from '../../services/categorias.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [RouterLink, SignedCurrencyPipe, DatePipe],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.css'
})
export class CategoriesComponent {
  private readonly svc = inject(CategoriesService);

  protected readonly categories = this.svc.categories;
  protected readonly selectedCategory = this.svc.selectedCategory;
  protected readonly selectedCategoryData = this.svc.selectedCategoryData;
  protected readonly transactions = this.svc.transactions;

  selectCategory(category: string): void {
    this.svc.selectCategory(category);
  }
}

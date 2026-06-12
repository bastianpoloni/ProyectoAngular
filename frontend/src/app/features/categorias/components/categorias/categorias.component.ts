import { Component, inject, signal, computed, OnInit } from '@angular/core';

import { ClpCurrencyPipe } from '../../../../shared/pipes/clp-currency.pipe';
import { Categorias } from '../../services/categorias.service';
import { BudgetCategory } from '../../interfaces/category';
import { AgregarCategoriaModalComponent } from '../agregar-categoria-modal/agregar-categoria-modal.component';
import { EditarCategoriaModalComponent } from '../editar-categoria-modal/editar-categoria-modal.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [ClpCurrencyPipe, AgregarCategoriaModalComponent, EditarCategoriaModalComponent],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.css'
})
export class CategoriesComponent implements OnInit {
  private readonly svc = inject(Categorias);

  ngOnInit(): void {
    this.svc.loadUsers();
    this.svc.fetchCategories();
    this.svc.fetchTransactions();
  }

  protected readonly categories = this.svc.categories;
  protected readonly selectedCategory = this.svc.selectedCategory;
  protected readonly selectedCategoryData = this.svc.selectedCategoryData;
  protected readonly transactions = this.svc.transactions;

  searchTerm = signal('');
  budgetErrorMessage = signal<string | null>(null);
  categoryToDelete = signal<BudgetCategory | null>(null);

  // Add category states
  isAddingCategory = false;

  // Edit category states
  isEditingCategory = false;
  editingCategoryData = signal<BudgetCategory | null>(null);

  get userBudget(): number {
    return this.svc.summary().budget;
  }

  filteredCategories = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const allCats = this.categories();
    const allTxs = this.svc.allTransactions();

    const mapped = allCats.map(category => {
      const spent = allTxs
        .filter((t) => !t.esIngreso && t.categoriaNombre === category.nombre)
        .reduce((acc, t) => acc + Math.abs(t.monto), 0);
      const limit = category.limiteMonto || 1;
      const percentageUsed = Math.min((spent / limit) * 100, 100);
      return {
        ...category,
        spent,
        percentageUsed
      };
    });

    if (!term) return mapped;
    return mapped.filter(c => c.nombre.toLowerCase().includes(term));
  });

  isAddingTransaction = false;

  get maxPorcentajePermitido(): number {
    const totalCurrent = this.categories().reduce((sum, c) => {
      let val = c.porcentajeLimite || 0;
      if (val > 0 && val <= 1) val = val * 100; // Normalize 0.3 to 30
      return sum + val;
    }, 0);
    return Math.max(0, 100 - totalCurrent);
  }

  maxPorcentajePermitidoEdicion(currentCategory: BudgetCategory): number {
    const totalCurrent = this.categories().reduce((sum, c) => {
      let val = c.porcentajeLimite || 0;
      if (val > 0 && val <= 1) val = val * 100;
      return sum + val;
    }, 0);
    const normalizedCurrent = currentCategory.porcentajeLimite > 0 && currentCategory.porcentajeLimite <= 1 
      ? currentCategory.porcentajeLimite * 100 
      : (currentCategory.porcentajeLimite || 0);
    return Math.max(0, 100 - (totalCurrent - normalizedCurrent));
  }

  getPreviewAmount(porcentajeStr: string): number {
    const p = Number(porcentajeStr) || 0;
    return (this.userBudget * p) / 100;
  }

  selectCategory(category: string): void {
    this.svc.selectCategory(category);
    this.isAddingTransaction = false;
  }

  addTransaction(desc: string, montoStr: string) {
    const montoRaw = Number(montoStr);
    if (!desc || isNaN(montoRaw) || montoRaw === 0) return;

    const isIngreso = this.selectedCategoryData().esIngreso ?? false;
    const monto = isIngreso ? Math.abs(montoRaw) : -Math.abs(montoRaw);

    if (!isIngreso) {
      const detail = this.selectedCategoryData();
      const limit = detail.limiteMonto ?? 0;
      const spent = detail.spent ?? 0;
      const remaining = limit - spent;
      if (montoRaw > remaining) {
        this.budgetErrorMessage.set('El monto ingresado excede el presupuesto disponible de la categoría.');
        return;
      }
    }

    this.svc.addTransaction({
      categoriaNombre: this.selectedCategory(),
      descripcion: desc,
      monto: monto,
      esIngreso: isIngreso,
      fecha: new Date()
    }).subscribe({
      next: () => {
        this.isAddingTransaction = false;
      },
      error: (err) => {
        this.budgetErrorMessage.set(err.error?.message || 'Error al guardar la transacción.');
      }
    });
  }

  // Trigger editing a category
  editCategory(event: Event, category: BudgetCategory): void {
    event.stopPropagation(); // Stop card selection click
    this.editingCategoryData.set(category);
    this.isEditingCategory = true;
  }

  deleteCategory(event: Event, category: BudgetCategory): void {
    event.stopPropagation();
    this.categoryToDelete.set(category);
  }

  confirmDeleteCategory(): void {
    const category = this.categoryToDelete();
    if (category) {
      this.svc.deleteCategory(category.id).subscribe({
        next: () => {
          this.categoryToDelete.set(null);
        },
        error: (err) => {
          this.budgetErrorMessage.set('Error al eliminar la categoría.');
          console.error(err);
          this.categoryToDelete.set(null);
        }
      });
    }
  }

  closeDeleteModal(): void {
    this.categoryToDelete.set(null);
  }
}

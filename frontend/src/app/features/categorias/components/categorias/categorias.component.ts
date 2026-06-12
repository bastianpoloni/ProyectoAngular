import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ClpCurrencyPipe } from '../../../../shared/pipes/clp-currency.pipe';
import { Categorias } from '../../services/categorias.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [RouterLink, ClpCurrencyPipe, DatePipe],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.css'
})
export class CategoriesComponent {
  private readonly svc = inject(Categorias);

  protected readonly categories = this.svc.categories;
  protected readonly selectedCategory = this.svc.selectedCategory;
  protected readonly selectedCategoryData = this.svc.selectedCategoryData;
  protected readonly transactions = this.svc.transactions;

  searchTerm = signal('');

  get userBudget(): number {
    return this.svc.summary().budget;
  }

  filteredCategories = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const all = this.categories();
    if (!term) return all;
    return all.filter(c => c.nombre.toLowerCase().includes(term));
  });

  isAddingTransaction = false;

  isAddingCategory = false;

  get maxPorcentajePermitido(): number {
    const totalCurrent = this.categories().reduce((sum, c) => {
      let val = c.porcentajeLimite || 0;
      if (val > 0 && val <= 1) val = val * 100; // Normalize 0.3 to 30
      return sum + val;
    }, 0);
    return Math.max(0, 100 - totalCurrent);
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

    this.svc.addTransaction({
      categoriaNombre: this.selectedCategory(),
      descripcion: desc,
      monto: monto,
      esIngreso: isIngreso,
      fecha: new Date()
    }).subscribe(() => {
      this.isAddingTransaction = false;
    });
  }

  getUsed(category: any): number {
    const allTxs = this.svc.allTransactions();
    const sum = allTxs
      .filter((t) => t.categoriaNombre === category.nombre)
      .reduce((acc, t) => acc + Math.abs(t.monto), 0);
    return sum;
  }

  getPercentageUsed(category: any): number {
    const used = this.getUsed(category);
    const limit = category.limiteMonto || 1; // Prevent division by zero
    return Math.min((used / limit) * 100, 100);
  }

  addCategory(nombre: string, porcentajeStr: string, esIngreso: boolean, icono: string, color: string) {
    if (!nombre) {
      alert('Por favor, ingresa un nombre para la categoría.');
      return;
    }
    let porcentaje = Number(porcentajeStr);
    if (isNaN(porcentaje)) porcentaje = 0;
    
    // Prevent exceeding max percentage
    if (porcentaje > this.maxPorcentajePermitido) {
      alert(`El porcentaje supera el límite permitido. Máximo disponible: ${this.maxPorcentajePermitido}%`);
      return;
    }

    const limiteMonto = (this.userBudget * porcentaje) / 100;

    this.svc.addCategory({
      nombre,
      porcentajeLimite: porcentaje,
      esIngreso,
      icono,
      color,
      limiteMonto
    }).subscribe({
      next: () => {
        this.isAddingCategory = false;
      },
      error: (err) => {
        alert('Error al guardar la categoría.');
        console.error('Error al guardar la categoría:', err);
      }
    });
  }
}

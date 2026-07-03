import { Component, inject, signal, OnInit } from '@angular/core';

import { DatePipe } from '@angular/common';

import { ClpCurrencyPipe } from '../../../../shared/pipes/clp-currency.pipe';
import { Historial } from '../../services/historial.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [ClpCurrencyPipe, DatePipe],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css'
})
export class HistoryComponent implements OnInit {
  private readonly svc = inject(Historial);

  ngOnInit(): void {
    this.svc.loadUsers();
    this.svc.fetchCategories();
    this.svc.fetchTransactions();
  }

  protected readonly timeline = this.svc.timeline;
  protected readonly mode = this.svc.mode;
  protected readonly selectedCategory = this.svc.selectedCategory;
  protected readonly startDate = this.svc.startDate;
  protected readonly endDate = this.svc.endDate;
  protected readonly categories = this.svc.categories;
  protected readonly transactions = this.svc.transactions;

  editingTransactionId = signal<string | null>(null);
  budgetErrorMessage = signal<string | null>(null);
  transactionToDelete = signal<string | null>(null);

  setMode(mode: 'Temporal' | 'Categoría'): void {
    this.svc.setMode(mode);
  }

  selectCategory(category: string): void {
    this.svc.selectCategory(category);
  }

  setStartDate(date: string): void {
    this.svc.startDate.set(date);
  }

  setEndDate(date: string): void {
    this.svc.endDate.set(date);
  }

  startEdit(transaction: any): void {
    this.editingTransactionId.set(transaction.id || null);
  }

  cancelEdit(): void {
    this.editingTransactionId.set(null);
  }

  deleteTransaction(id: string | undefined): void {
    if (!id) return;
    this.transactionToDelete.set(id);
  }

  confirmDeleteTransaction(): void {
    const id = this.transactionToDelete();
    if (id) {
      this.svc.deleteTransaction(id).subscribe({
        next: () => {
          this.transactionToDelete.set(null);
        },
        error: (err) => {
          alert('Error al eliminar el movimiento.');
          console.error(err);
          this.transactionToDelete.set(null);
        }
      });
    }
  }

  closeDeleteModal(): void {
    this.transactionToDelete.set(null);
  }

  protected formatAmount(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val) {
      val = Number(val).toLocaleString('es-CL');
    }
    input.value = val;
  }

  protected formatInitialMonto(monto: number): string {
    const absVal = Math.abs(monto);
    return absVal > 0 ? absVal.toLocaleString('es-CL') : '';
  }

  saveEdit(transaction: any, desc: string, montoStr: string, catNombre: string): void {
    const id = transaction.id;
    if (!id) return;
    const montoRaw = Number(montoStr.replace(/\D/g, ''));
    if (!desc || isNaN(montoRaw) || montoRaw === 0) {
      alert('Por favor, ingresa una descripción válida y un monto distinto de cero.');
      return;
    }

    const categoryObj = this.categories().find(c => c.nombre === catNombre);
    const isIngreso = categoryObj?.esIngreso ?? false;
    const monto = isIngreso ? Math.abs(montoRaw) : -Math.abs(montoRaw);

    if (!isIngreso && categoryObj) {
      const spent = this.transactions()
        .filter(t => t.id !== transaction.id && !t.esIngreso && t.categoriaNombre === catNombre)
        .reduce((acc, t) => acc + Math.abs(t.monto), 0);
      const remaining = (categoryObj.limiteMonto ?? 0) - spent;
      if (montoRaw > remaining) {
        this.budgetErrorMessage.set('El monto ingresado excede el presupuesto disponible de la categoría.');
        return;
      }
    }

    this.svc.updateTransaction(id, {
      descripcion: desc,
      monto: monto,
      categoriaNombre: catNombre,
      esIngreso: isIngreso,
      fecha: transaction.fecha
    }).subscribe({
      next: () => {
        this.cancelEdit();
      },
      error: (err) => {
        this.budgetErrorMessage.set(err.error?.message || 'Error al guardar la transacción.');
        console.error(err);
      }
    });
  }

  isCategoryDeleted(catNombre: string): boolean {
    if (!catNombre) return false;
    const list = this.categories();
    if (list.length === 0) return false;
    return !list.some(c => c.nombre.toLowerCase() === catNombre.toLowerCase());
  }
}

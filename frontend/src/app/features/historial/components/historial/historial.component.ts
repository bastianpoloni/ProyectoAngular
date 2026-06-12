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

  deleteTransaction(id: string | undefined, monto: number): void {
    if (!id) return;
    if (confirm('¿Estás seguro de que deseas eliminar este movimiento?')) {
      this.svc.deleteTransaction(id, monto).subscribe();
    }
  }

  saveEdit(transaction: any, desc: string, montoStr: string, catNombre: string): void {
    const id = transaction.id;
    if (!id) return;
    const montoRaw = Number(montoStr);
    if (!desc || isNaN(montoRaw) || montoRaw === 0) {
      alert('Por favor, ingresa una descripción válida y un monto distinto de cero.');
      return;
    }

    const categoryObj = this.categories().find(c => c.nombre === catNombre);
    const isIngreso = categoryObj?.esIngreso ?? false;
    const monto = isIngreso ? Math.abs(montoRaw) : -Math.abs(montoRaw);

    this.svc.updateTransaction(id, {
      descripcion: desc,
      monto: monto,
      categoriaNombre: catNombre,
      esIngreso: isIngreso,
      fecha: transaction.fecha
    }, transaction.monto).subscribe({
      next: () => {
        this.cancelEdit();
      },
      error: (err) => {
        alert('Error al guardar la transacción');
        console.error(err);
      }
    });
  }
}

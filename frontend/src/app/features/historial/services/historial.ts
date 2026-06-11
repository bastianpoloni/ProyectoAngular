import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { BudgetCategory, TimelineEntry, TransactionEntry } from '../../../interfaces/billetera.interface';

@Injectable({ providedIn: 'root' })
export class Historial {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';
  private readonly uid = '335ETJFCzKMe5WKJm9e3BltRLPQ2';

  private readonly categoriesState = signal<BudgetCategory[]>([]);
  readonly categories = computed(() => this.categoriesState());

  private readonly transactionsState = signal<TransactionEntry[]>([]);
  readonly transactions = computed(() => this.transactionsState());

  readonly selectedCategory = signal('Comida');
  readonly historyMode = signal<'Temporal' | 'Categoría'>('Categoría');

  readonly categoryLabels = computed(() => this.categoriesState().map((item) => item.nombre));
  readonly categoryOptions = computed(() => ['Todas', ...this.categoryLabels()]);

  readonly timeline = computed(() => {
    const transactions = this.transactionsState();
    const days = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

    const entries = days.map((label, dayIndex) => {
      const dayOfWeek = (dayIndex + 1) % 7;
      const dayTransactions = transactions.filter(t => {
        const date = new Date(t.fecha);
        return date.getDay() === dayOfWeek;
      });

      const income = dayTransactions
        .filter(t => t.esIngreso)
        .reduce((acc, t) => acc + t.monto, 0);

      const expense = dayTransactions
        .filter(t => !t.esIngreso)
        .reduce((acc, t) => acc + Math.abs(t.monto), 0);

      return { label, income, expense };
    });

    const maxValue = Math.max(
      1,
      ...entries.flatMap(entry => [entry.income, entry.expense])
    );

    return entries.map(entry => ({
      ...entry,
      incomePercent: Math.round((entry.income / maxValue) * 100),
      expensePercent: Math.round((entry.expense / maxValue) * 100)
    }));
  });

  constructor() {
    this.fetchCategories();
    this.fetchTransactions();
  }

  fetchCategories(): void {
    this.http.get<BudgetCategory[]>(`${this.apiUrl}/usuarios/${this.uid}/categorias`).subscribe({
      next: (data) => this.categoriesState.set(data.map(category => this.normalizeCategory(category))),
      error: (error) => console.error('Error fetching categories:', error)
    });
  }

  fetchTransactions(): void {
    this.http.get<TransactionEntry[]>(`${this.apiUrl}/usuarios/${this.uid}/transacciones`).subscribe({
      next: (data) => this.transactionsState.set(data.map(t => ({ ...t, fecha: new Date(t.fecha) }))),
      error: (error) => console.error('Error fetching transactions:', error)
    });
  }

  setSelectedCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  // Alias para compatibilidad con la vista
  selectCategory(category: string): void {
    this.setSelectedCategory(category);
  }

  setHistoryMode(mode: 'Temporal' | 'Categoría'): void {
    this.historyMode.set(mode);
  }

  // Alias para compatibilidad con la vista
  setMode(mode: 'Temporal' | 'Categoría'): void {
    this.setHistoryMode(mode);
  }

  // Getter para compatibilidad con HistoryService
  get mode() {
    return this.historyMode;
  }

  private normalizeCategory(category: BudgetCategory): BudgetCategory {
    const budget = 4500; // static budget placeholder matching calculations
    const limiteMonto = category.limiteMonto !== undefined 
      ? category.limiteMonto 
      : Math.round(budget * (category.porcentajeLimite / 100));
    
    return {
      ...category,
      limiteMonto,
      icono: this.resolveIcono(category.icono)
    };
  }

  private resolveIcono(value: string | undefined): string {
    const icono = (value ?? '').toString().trim().toLowerCase();
    const map: Record<string, string> = {
      'ic_menu_preferences': '⚙️',
      'comida': '🍔',
      'alimentacion': '🍲',
      'transporte': '🚗',
      'sueldo': '💰',
      'venta': '💵',
      'entretenimiento': '🎬',
      'ocio': '🎉',
      'remuneraciones (sueldo)': '💼',
      'remuneraciones': '💼',
      'gasto': '💸',
      'default': '🔔'
    };

    if (!icono) {
      return '🔔';
    }

    if (Object.values(map).includes(icono)) {
      return value ?? '🔔';
    }

    const simpleKey = icono.replace(/[_\s-]/g, '');
    return map[icono] ?? map[simpleKey] ?? '🔔';
  }
}

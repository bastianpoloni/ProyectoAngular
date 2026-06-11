import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { BudgetCategory, TransactionEntry, User } from '../../../interfaces/billetera.interface';

const API_URL = 'http://localhost:3000';
const UID = 'qeCnjAUIsgdaXII7TjfZF4QGgOd2';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly uid = UID;

  private readonly usersState = signal<User[]>([]);
  private readonly categoriesState = signal<BudgetCategory[]>([]);
  private readonly transactionsState = signal<TransactionEntry[]>([]);

  readonly timeline = computed(() => this.buildTimeline());
  readonly mode = signal<'Temporal' | 'Categoría'>('Categoría');
  readonly selectedCategory = signal('Todas');
  readonly categories = computed(() => ['Todas', ...this.categoriesState().map((item) => item.nombre)]);
  readonly transactions = computed(() => {
    const category = this.selectedCategory();
    return this.transactionsState().filter((item) => item.categoriaNombre === category || category === 'Todas');
  });

  private get currentUser() {
    return this.usersState()[0] ?? null;
  }

  constructor() {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.http.get<User>(`${this.apiUrl}/usuarios/${this.uid}`).subscribe({
      next: (data) => {
        this.usersState.set([data]);
        this.fetchCategories();
        this.fetchTransactions();
      },
      error: (error: unknown) => console.error('Error loading users:', error)
    });
  }

  private fetchCategories(): void {
    this.http.get<BudgetCategory[]>(`${this.apiUrl}/usuarios/${this.uid}/categorias`).subscribe({
      next: (data) => this.categoriesState.set(data.map((category) => this.normalizeCategory(category, this.currentUser?.presupuesto ?? 0))),
      error: (error: unknown) => console.error('Error fetching categories:', error)
    });
  }

  private fetchTransactions(): void {
    this.http.get<TransactionEntry[]>(`${this.apiUrl}/usuarios/${this.uid}/transacciones`).subscribe({
      next: (data) => this.transactionsState.set(data.map((transaction) => ({ ...transaction, fecha: new Date(transaction.fecha) }))),
      error: (error: unknown) => console.error('Error fetching transactions:', error)
    });
  }

  setMode(mode: 'Temporal' | 'Categoría'): void {
    this.mode.set(mode);
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  private buildTimeline() {
    const days = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
    const entries = days.map((label, dayIndex) => {
      const dayOfWeek = (dayIndex + 1) % 7;
      const dayTransactions = this.transactionsState().filter((transaction) => {
        const date = new Date(transaction.fecha);
        return date.getDay() === dayOfWeek;
      });

      const income = dayTransactions
        .filter((transaction) => transaction.esIngreso)
        .reduce((acc, transaction) => acc + transaction.monto, 0);

      const expense = dayTransactions
        .filter((transaction) => !transaction.esIngreso)
        .reduce((acc, transaction) => acc + Math.abs(transaction.monto), 0);

      return { label, income, expense };
    });

    const maxValue = Math.max(1, ...entries.flatMap((entry) => [entry.income, entry.expense]));

    return entries.map((entry) => ({
      ...entry,
      incomePercent: Math.round((entry.income / maxValue) * 100),
      expensePercent: Math.round((entry.expense / maxValue) * 100)
    }));
  }

  private normalizeCategory(category: BudgetCategory, budget: number): BudgetCategory {
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
    const rawValue = (value ?? '').toString().trim();
    if (!rawValue) {
      return '❌';
    }

    const icono = rawValue.toLowerCase();
    const map: Record<string, string> = {
      ic_menu_preferences: '⚙️',
      comida: '🍔',
      alimentacion: '🍲',
      transporte: '🚗',
      sueldo: '💰',
      venta: '💵',
      entretenimiento: '🎬',
      ocio: '🎉',
      'remuneraciones (sueldo)': '💼',
      remuneraciones: '💼',
      gasto: '💸'
    };

    const simpleKey = icono.replace(/[_\s-]/g, '');
    return map[icono] ?? map[simpleKey] ?? rawValue;
  }
}

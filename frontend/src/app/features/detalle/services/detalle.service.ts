import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { BudgetCategory, TransactionEntry, User } from '../../../interfaces/billetera.interface';

const API_URL = 'http://localhost:3000';
const UID = 'qeCnjAUIsgdaXII7TjfZF4QGgOd2';

@Injectable({ providedIn: 'root' })
export class DetailService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly uid = UID;

  private readonly usersState = signal<User[]>([]);
  private readonly categoriesState = signal<BudgetCategory[]>([]);
  private readonly transactionsState = signal<TransactionEntry[]>([]);

  readonly categories = computed(() => this.categoriesState());
  readonly summary = computed(() => this.buildSummary());
  readonly transactions = computed(() => this.transactionsState());

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
      next: (data) => this.categoriesState.set(data.map((category) => this.normalizeCategory(category, this.summary().budget))),
      error: (error: unknown) => console.error('Error fetching categories:', error)
    });
  }

  private fetchTransactions(): void {
    this.http.get<TransactionEntry[]>(`${this.apiUrl}/usuarios/${this.uid}/transacciones`).subscribe({
      next: (data) => this.transactionsState.set(data.map((transaction) => ({ ...transaction, fecha: new Date(transaction.fecha) }))),
      error: (error: unknown) => console.error('Error fetching transactions:', error)
    });
  }

  private buildSummary() {
    const user = this.currentUser;
    if (!user) {
      return { balance: 0, budget: 0, spent: 0, savings: 0, monthlyIncome: 0 };
    }

    const budget = user.presupuesto ?? 0;
    const spent = this.transactionsState()
      .filter((transaction) => !transaction.esIngreso)
      .reduce((acc, transaction) => acc + Math.abs(transaction.monto), 0);
    const savings = this.categoriesState().reduce((acc, category) => {
      const limit = category.limiteMonto ?? Math.round(budget * (category.porcentajeLimite / 100));
      const categorySpent = this.transactionsState()
        .filter((transaction) => !transaction.esIngreso && transaction.categoriaNombre === category.nombre)
        .reduce((sum, transaction) => sum + Math.abs(transaction.monto), 0);

      return limit > categorySpent ? acc + (limit - categorySpent) : acc;
    }, 0);

    return { balance: user.saldo, budget, spent, savings, monthlyIncome: 0 };
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

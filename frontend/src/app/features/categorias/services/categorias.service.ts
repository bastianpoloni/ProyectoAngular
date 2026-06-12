import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap, switchMap } from 'rxjs';

import { User } from '../../ajustes/interfaces/user';
import { TransactionEntry } from '../../historial/interfaces/transaction';
import { BudgetCategory } from '../interfaces/category';

type CategoryDetail = BudgetCategory & {
  spent: number;
  trend: string;
};

@Injectable({ providedIn: 'root' })
export class Categorias {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';
  get uid(): string {
    const userJson = localStorage.getItem('usuario');
    if (userJson) {
      try {
        return JSON.parse(userJson).id;
      } catch (e) {}
    }
    return '335ETJFCzKMe5WKJm9e3BltRLPQ2';
  }

  private readonly usersState = signal<User[]>([]);
  readonly users = computed(() => this.usersState());
  readonly currentUser = computed(() => this.usersState()[0] ?? null);

  private readonly categoriesState = signal<BudgetCategory[]>([]);
  readonly categories = computed(() => this.categoriesState());

  private readonly transactionsState = signal<TransactionEntry[]>([]);
  readonly allTransactions = computed(() => this.transactionsState());

  readonly totalSpent = computed(() => {
    const transactions = this.transactionsState();
    return transactions
      .filter((t) => !t.esIngreso)
      .reduce((acc, t) => acc + Math.abs(t.monto), 0);
  });

  readonly summary = computed(() => {
    const user = this.usersState().length > 0 ? this.usersState()[0] : null;
    if (!user) return { balance: 0, budget: 0, spent: 0, savings: 0, monthlyIncome: 0 };
    const balance = user.saldo;
    const spent = this.totalSpent();
    const budget = user.presupuesto ?? 0;
    const monthlyIncome = user.ingresoMensual ?? 0;
    const allTransactions = this.transactionsState();
    const categoriesSpent = this.categoriesState().reduce((sum, category) => {
      const categorySpent = allTransactions
        .filter((transaction) => !transaction.esIngreso && transaction.categoriaNombre === category.nombre)
        .reduce((sum, transaction) => sum + Math.abs(transaction.monto), 0);

      return sum + categorySpent;
    }, 0);
    const savings = budget - categoriesSpent;

    return { balance, budget, spent, savings, monthlyIncome };
  });

  readonly topCategories = computed(() => {
    const allTransactions = this.transactionsState();
    const mapped = this.categoriesState().map(cat => {
      const spent = allTransactions
        .filter(t => !t.esIngreso && t.categoriaNombre === cat.nombre)
        .reduce((acc, t) => acc + Math.abs(t.monto), 0);
      return { ...cat, spent };
    });

    return mapped
      .sort((left, right) => right.spent - left.spent)
      .slice(0, 3);
  });

  readonly categoryLabels = computed(() => this.categoriesState().map((item) => item.nombre));

  readonly savingsRate = computed(() => {
    const summary = this.summary();
    return summary.budget > 0 ? Math.round((summary.savings / summary.budget) * 100) : 0;
  });

  readonly selectedCategory = signal('Comida');

  readonly selectedCategoryData = computed<CategoryDetail>(() => {
    const currentCategory = this.selectedCategory();
    const category = this.categoriesState().find((item) => item.nombre === currentCategory) ?? this.categoriesState()[0];

    if (!category) {
      return {
        id: '',
        nombre: '',
        color: '#666666',
        esIngreso: false,
        icono: '❌',
        porcentajeLimite: 0,
        limiteMonto: 0,
        spent: 0,
        trend: ''
      };
    }

    const spent = this.transactionsState()
      .filter((item) => !item.esIngreso && item.categoriaNombre === category.nombre)
      .reduce((acc, item) => acc + Math.abs(item.monto), 0);
    const limit = category.limiteMonto ?? Math.round((this.summary().budget || 0) * (category.porcentajeLimite / 100));
    const trend = limit > 0 ? `${Math.min(Math.round((spent / limit) * 100), 100)}% usado` : '';

    return {
      ...category,
      spent,
      trend
    };
  });

  readonly filteredTransactions = computed(() => {
    const category = this.selectedCategory();
    return this.transactionsState().filter((item) => item.categoriaNombre === category || category === 'Todas');
  });

  // Alias compatible con lo que usaba el CategoriesService
  get transactions() {
    return this.filteredTransactions;
  }

  constructor() {
    this.loadUsers();
    this.fetchCategories();
    this.fetchTransactions();
  }

  private loadUsers(): void {
    this.http.get<User>(`${this.apiUrl}/usuarios/${this.uid}`).subscribe({
      next: (data) => this.usersState.set([data]),
      error: (err) => console.error('Error loading users:', err),
    });
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

  addCategory(category: Omit<BudgetCategory, 'id' | 'spent' | 'trend'>) {
    return this.http.post<BudgetCategory>(`${this.apiUrl}/usuarios/${this.uid}/categorias`, category).pipe(
      tap(() => this.fetchCategories())
    );
  }

  updateCategory(categoryId: string, category: Partial<CategoriaPresupuesto>) {
    return this.http.patch<CategoriaPresupuesto>(`${this.apiUrl}/usuarios/${this.uid}/categorias/${categoryId}`, category).pipe(
      tap(() => this.fetchCategories())
    );
  }

  addTransaction(transaction: Omit<TransactionEntry, 'id'>) {
    return this.http.post<TransactionEntry>(`${this.apiUrl}/usuarios/${this.uid}/transacciones`, transaction).pipe(
      tap(() => this.fetchTransactions()),
      switchMap(() => this.updateBalance(transaction.monto))
    );
  }

  updateBalance(amount: number) {
    const current = this.currentUser();
    if (!current) {
      throw new Error('Usuario no cargado');
    }
    const newSaldo = current.saldo + amount;
    return this.http.patch<User>(`${this.apiUrl}/usuarios/${this.uid}`, { saldo: newSaldo }).pipe(
      tap((user) => this.usersState.set([user]))
    );
  }

  updateBudget(budget: number) {
    return this.http.patch<User>(`${this.apiUrl}/usuarios/${this.uid}`, { presupuesto: budget }).pipe(
      tap((user) => this.usersState.set([user]))
    );
  }

  setBudget(budget: number) {
    return this.updateBudget(budget);
  }

  private normalizeCategory(category: BudgetCategory): BudgetCategory {
    const budget = this.summary().budget || 0;
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
      'gasto': '💸'
    };

    const simpleKey = icono.replace(/[_\s-]/g, '');
    return map[icono] ?? map[simpleKey] ?? rawValue;
  }
}

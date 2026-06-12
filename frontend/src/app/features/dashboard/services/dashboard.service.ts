import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap, switchMap } from 'rxjs';

import { User } from '../../ajustes/interfaces/user';
import { BudgetCategory } from '../../categorias/interfaces/category';
import { TransactionEntry } from '../../historial/interfaces/transaction';

@Injectable({ providedIn: 'root' })
export class Dashboard {
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

  private readonly categoriesState = signal<BudgetCategory[]>([]);
  readonly categories = computed(() => this.categoriesState());

  private readonly transactionsState = signal<TransactionEntry[]>([]);
  readonly transactions = computed(() => {
    return [...this.transactionsState()].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  });

  readonly totalSpent = computed(() => {
    const transactions = this.transactionsState();
    return transactions
      .filter(t => !t.esIngreso)
      .reduce((acc, t) => acc + Math.abs(t.monto), 0);
  });

  readonly summary = computed(() => {
    const user = this.usersState().length > 0 ? this.usersState()[0] : null;
    if (!user) return { balance: 0, budget: 0, spent: 0, savings: 0, monthlyIncome: 0 };
    const balance = user.saldo;
    const spent = this.totalSpent();
    const budget = user.presupuesto || 0;
    
    const allTransactions = this.transactionsState();
    const categoriesSpent = this.categoriesState().reduce((sum, category) => {
      const categorySpent = allTransactions
        .filter(t => !t.esIngreso && t.categoriaNombre === category.nombre)
        .reduce((acc, t) => acc + Math.abs(t.monto), 0);
      return sum + categorySpent;
    }, 0);
    const savings = budget - categoriesSpent;

    const monthlyIncome = 5200; // TODO
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

  readonly savingsRate = computed(() => {
    const summary = this.summary();
    return summary.budget > 0 ? Math.round((summary.savings / summary.budget) * 100) : 0;
  });

  constructor() {
    this.loadUsers();
    this.fetchCategories();
    this.fetchTransactions();
  }

  loadUsers(): void {
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

  addTransaction(transaction: Omit<TransactionEntry, 'id'>) {
    return this.http.post<TransactionEntry>(`${this.apiUrl}/usuarios/${this.uid}/transacciones`, transaction).pipe(
      tap(() => this.fetchTransactions()),
      switchMap(() => this.updateBalance(transaction.monto))
    );
  }

  updateBalance(amount: number) {
    const user = this.usersState()[0];
    if (!user) {
      throw new Error('Usuario no cargado');
    }
    const newSaldo = user.saldo + amount;
    return this.http.patch<User>(`${this.apiUrl}/usuarios/${this.uid}`, { saldo: newSaldo }).pipe(
      tap((updatedUser) => this.usersState.set([updatedUser]))
    );
  }
}

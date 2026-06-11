import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';

import { BudgetCategory } from '../../categorias/interfaces/category';
import { User } from '../interfaces/user';

@Injectable({ providedIn: 'root' })
export class Ajustes {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';
  private readonly uid = '335ETJFCzKMe5WKJm9e3BltRLPQ2';

  private readonly usersState = signal<User[]>([]);
  readonly users = computed(() => this.usersState());
  readonly currentUser = computed(() => this.usersState()[0] ?? null);

  private readonly usersLoadingState = signal<boolean>(false);
  readonly usersLoading = computed(() => this.usersLoadingState());

  private readonly usersErrorState = signal<string | null>(null);
  readonly usersError = computed(() => this.usersErrorState());

  private readonly categoriesState = signal<BudgetCategory[]>([]);
  readonly categories = computed(() => this.categoriesState());

  private readonly transactionsState = signal<any[]>([]);

  readonly totalSpent = computed(() => {
    const transactions = this.transactionsState();
    return transactions
      .filter(t => !t.esIngreso)
      .reduce((acc, t) => acc + t.monto, 0);
  });

  readonly summary = computed(() => {
    const user = this.usersState().length > 0 ? this.usersState()[0] : null;
    if (!user) return { balance: 0, budget: 0, spent: 0, savings: 0, monthlyIncome: 0 };
    const balance = user.saldo;
    const spent = this.totalSpent();
    const budget = user.presupuesto || 0;
    
    let savings = 0;
    const allTransactions = this.transactionsState();
    this.categoriesState().forEach(category => {
      const limit = category.limiteMonto !== undefined ? category.limiteMonto : Math.round(budget * (category.porcentajeLimite / 100));
      const categorySpent = allTransactions
        .filter(t => !t.esIngreso && t.categoriaNombre === category.nombre)
        .reduce((acc, t) => acc + Math.abs(t.monto), 0);
      
      if (limit > categorySpent) {
        savings += (limit - categorySpent);
      }
    });

    const monthlyIncome = 5200; // TODO
    return { balance, budget, spent, savings, monthlyIncome };
  });

  constructor() {
    this.loadUsers();
    this.fetchCategories();
    this.fetchTransactions();
  }

  private loadUsers(): void {
    this.usersLoadingState.set(true);
    this.usersErrorState.set(null);
    this.http.get<User>(`${this.apiUrl}/usuarios/${this.uid}`).subscribe({
      next: (data) => {
        this.usersState.set([data]);
        this.usersLoadingState.set(false);
      },
      error: (err) => {
        this.usersErrorState.set(err.message || 'Error loading users');
        this.usersLoadingState.set(false);
      },
    });
  }

  fetchCategories(): void {
    this.http.get<BudgetCategory[]>(`${this.apiUrl}/usuarios/${this.uid}/categorias`).subscribe({
      next: (data) => this.categoriesState.set(data.map(category => this.normalizeCategory(category))),
      error: (error) => console.error('Error fetching categories:', error)
    });
  }

  fetchTransactions(): void {
    this.http.get<any[]>(`${this.apiUrl}/usuarios/${this.uid}/transacciones`).subscribe({
      next: (data) => this.transactionsState.set(data.map(t => ({ ...t, fecha: new Date(t.fecha) }))),
      error: (error) => console.error('Error fetching transactions:', error)
    });
  }

  addBalance(amount: number) {
    const current = this.currentUser();
    if (!current) {
      throw new Error('Usuario no cargado');
    }
    const newSaldo = current.saldo + amount;
    return this.http.patch<User>(`${this.apiUrl}/usuarios/${this.uid}`, { saldo: newSaldo }).pipe(
      tap((user) => this.usersState.set([user]))
    );
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
}

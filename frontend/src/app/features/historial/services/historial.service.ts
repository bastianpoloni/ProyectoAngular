import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap, switchMap } from 'rxjs';

import { BudgetCategory } from '../../categorias/interfaces/category';
import { User } from '../../ajustes/interfaces/user';
import { TimelineEntry, TransactionEntry } from '../interfaces/transaction';

@Injectable({ providedIn: 'root' })
export class Historial {
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

  private readonly categoriesState = signal<BudgetCategory[]>([]);
  readonly categories = computed(() => this.categoriesState());

  private readonly usersState = signal<User[]>([]);
  readonly currentUser = computed(() => this.usersState()[0] ?? null);

  private readonly transactionsState = signal<TransactionEntry[]>([]);
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');

  readonly transactions = computed(() => {
    const category = this.selectedCategory();
    const start = this.startDate();
    const end = this.endDate();
    let list = this.transactionsState();

    if (category && category !== 'Todas') {
      list = list.filter(t => t.categoriaNombre === category);
    }

    if (start) {
      const startDateObj = new Date(start);
      startDateObj.setHours(0, 0, 0, 0);
      list = list.filter(t => new Date(t.fecha) >= startDateObj);
    }

    if (end) {
      const endDateObj = new Date(end);
      endDateObj.setHours(23, 59, 59, 999);
      list = list.filter(t => new Date(t.fecha) <= endDateObj);
    }

    return list;
  });

  readonly selectedCategory = signal('Todas');
  readonly historyMode = signal<'Temporal' | 'Categoría'>('Categoría');

  readonly categoryLabels = computed(() => this.categoriesState().map((item) => item.nombre));
  readonly categoryOptions = computed(() => ['Todas', ...this.categoryLabels()]);

  readonly timeline = computed(() => {
    const transactions = this.transactions();
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

  deleteTransaction(id: string, monto: number) {
    return this.http.delete(`${this.apiUrl}/usuarios/${this.uid}/transacciones/${id}`).pipe(
      tap(() => this.fetchTransactions()),
      switchMap(() => this.updateBalance(-monto))
    );
  }

  updateTransaction(id: string, transaction: Omit<TransactionEntry, 'id'>, oldMonto: number) {
    return this.http.patch<TransactionEntry>(`${this.apiUrl}/usuarios/${this.uid}/transacciones/${id}`, transaction).pipe(
      tap(() => this.fetchTransactions()),
      switchMap(() => this.updateBalance(transaction.monto - oldMonto))
    );
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

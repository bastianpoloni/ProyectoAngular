import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap, switchMap } from 'rxjs';

import {
  BudgetCategory,
  ScreenPreview,
  TimelineEntry,
  TransactionEntry,
  User,
  WalletSummary
} from '../../interfaces/billetera.interface';

@Injectable({ providedIn: 'root' })
export class BilleteraService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';
  private readonly uid = 'qeCnjAUIsgdaXII7TjfZF4QGgOd2'; // Real user ID from Firebase

  private readonly usersState = signal<User[]>([]);
  readonly users = computed(() => this.usersState());
  readonly currentUser = computed(() => this.usersState()[0] ?? null);

  private readonly usersLoadingState = signal<boolean>(false);
  readonly usersLoading = computed(() => this.usersLoadingState());

  private readonly usersErrorState = signal<string | null>(null);
  readonly usersError = computed(() => this.usersErrorState());

  constructor() {
    this.loadUsers();
    this.fetchCategories();
    this.fetchTransactions();
  }

  private readonly categoriesState = signal<BudgetCategory[]>([]);
  readonly categories = computed(() => this.categoriesState());

  private readonly transactionsState = signal<TransactionEntry[]>([
    {
      id: '1',
      categoriaNombre: 'Comida',
      descripcion: 'Compra en supermercado',
      monto: -15000,
      esIngreso: false,
      fecha: new Date('2023-10-01'),
    },
    {
      id: '2',
      categoriaNombre: 'Transporte',
      descripcion: 'Pasaje de bus',
      monto: -2000,
      esIngreso: false,
      fecha: new Date('2023-10-02'),
    },
    {
      id: '3',
      categoriaNombre: 'Entretenimiento',
      descripcion: 'Película en cine',
      monto: -8000,
      esIngreso: false,
      fecha: new Date('2023-10-03'),
    },
  ]);
  readonly transactions = computed(() => this.transactionsState());

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

  private readonly screenState = signal<ScreenPreview[]>([
    {
      title: 'Resumen',
      route: '/',
      description: 'Balance, metas y gastos recientes',
      accent: '#4a84b7'
    },
    {
      title: 'Categorías',
      route: '/categorias',
      description: 'Organización por features y presupuesto',
      accent: '#7bc96f'
    },
    {
      title: 'Detalle',
      route: '/detalle',
      description: 'Vista del gasto seleccionado y distribución',
      accent: '#f3b548'
    },
    {
      title: 'Histórico',
      route: '/historial',
      description: 'Flujo temporal y comparación por categoría',
      accent: '#f1a8cb'
    }
  ]);
  readonly previews = computed(() => this.screenState());

  readonly summary = computed(() => {
    const user = this.usersState().length > 0 ? this.usersState()[0] : null;
    if (!user) return { balance: 0, budget: 0, spent: 0, savings: 0, monthlyIncome: 0 };
    const balance = user.saldo;
    const spent = this.totalSpent();
    const budget = user.presupuesto || 0; // Presupuesto definido por el usuario
    
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
  readonly totalSpent = computed(() => {
    const transactions = this.transactionsState();
    return transactions
      .filter(t => !t.esIngreso)
      .reduce((acc, t) => acc + t.monto, 0);
  });

  readonly savingsRate = computed(() => {
    const summary = this.summary();
    return summary.budget > 0 ? Math.round((summary.savings / summary.budget) * 100) : 0;
  });

  readonly selectedCategory = signal('Comida');
  readonly historyMode = signal<'Temporal' | 'Categoría'>('Categoría');

  readonly selectedCategoryData = computed(() => {
    const currentCategory = this.selectedCategory();
    return this.categoriesState().find((item) => item.nombre === currentCategory) ?? this.categoriesState()[0];
  });

  readonly filteredTransactions = computed(() => {
    const category = this.selectedCategory();
    return this.transactionsState().filter((item) => item.categoriaNombre === category || category === 'Todas');
  });

  readonly categoryOptions = computed(() => ['Todas', ...this.categoryLabels()]);

  setSelectedCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  setHistoryMode(mode: 'Temporal' | 'Categoría'): void {
    this.historyMode.set(mode);
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
    this.http.get<TransactionEntry[]>(`${this.apiUrl}/usuarios/${this.uid}/transacciones`).subscribe({
      next: (data) => this.transactionsState.set(data.map(t => ({ ...t, fecha: new Date(t.fecha) }))),
      error: (error) => console.error('Error fetching transactions:', error)
    });
  }

  addCategory(category: Omit<BudgetCategory, 'id' | 'spent'>) {
    return this.http.post<BudgetCategory>(`${this.apiUrl}/usuarios/${this.uid}/categorias`, category).pipe(
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

  registerUser(payload: { nombre: string; email: string; password: string; saldo?: number }) {
    return this.http.post<User>(`${this.apiUrl}/auth/register`, payload);
  }

  loginUser(payload: { email: string; password: string }) {
    return this.http.post<User>(`${this.apiUrl}/auth/login`, payload);
  }
}


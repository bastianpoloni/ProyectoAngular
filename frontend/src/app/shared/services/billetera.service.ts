import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs';

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
  private readonly uid = 'testUser'; // TODO: get from auth

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

  private readonly categoriesState = signal<BudgetCategory[]>([
    {
      id: '1',
      nombre: 'Comida',
      icono: '🍔',
      color: '#FF6B6B',
      esIngreso: false,
      porcentajeLimite: 0.8,
      limite: 100000,
      spent: 80000,
    },
    {
      id: '2',
      nombre: 'Transporte',
      icono: '🚗',
      color: '#4ECDC4',
      esIngreso: false,
      porcentajeLimite: 0.6,
      limite: 50000,
      spent: 30000,
    },
    {
      id: '3',
      nombre: 'Entretenimiento',
      icono: '🎬',
      color: '#45B7D1',
      esIngreso: false,
      porcentajeLimite: 0.9,
      limite: 30000,
      spent: 27000,
    },
  ]);
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

  private readonly timelineState = signal<TimelineEntry[]>([
    { label: 'Lu', income: 240, expense: 60 },
    { label: 'Ma', income: 180, expense: 180 },
    { label: 'Mi', income: 320, expense: 90 },
    { label: 'Ju', income: 140, expense: 220 },
    { label: 'Vi', income: 260, expense: 120 },
    { label: 'Sa', income: 180, expense: 300 },
    { label: 'Do', income: 90, expense: 80 }
  ]);
  readonly timeline = computed(() => this.timelineState());

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
    const budget = 4500; // TODO: calculate or fetch
    const savings = 680; // TODO
    const monthlyIncome = 5200; // TODO
    return { balance, budget, spent, savings, monthlyIncome };
  });

  readonly topCategories = computed(() =>
    this.categoriesState()
      .slice()
      .sort((left, right) => (right.spent || 0) - (left.spent || 0))
      .slice(0, 4)
  );

  readonly categoryLabels = computed(() => this.categoriesState().map((item) => item.nombre));
  readonly totalSpent = computed(() => {
    const transactions = this.transactionsState();
    return transactions
      .filter(t => !t.esIngreso)
      .reduce((acc, t) => acc + t.monto, 0);
  });

  readonly savingsRate = computed(() => {
    const summary = this.summary();
    return summary.monthlyIncome > 0 ? Math.round((summary.savings / summary.monthlyIncome) * 100) : 0;
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
      next: (data) => this.categoriesState.set(data),
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
      tap(() => this.fetchTransactions())
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

  registerUser(payload: { nombre: string; email: string; password: string; saldo?: number }) {
    return this.http.post<User>(`${this.apiUrl}/auth/register`, payload);
  }

  loginUser(payload: { email: string; password: string }) {
    return this.http.post<User>(`${this.apiUrl}/auth/login`, payload);
  }
}


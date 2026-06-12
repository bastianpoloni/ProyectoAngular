import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { switchMap, tap } from 'rxjs';
import { CategoriaPresupuesto } from '../interface/categoria-presupuesto.interface';
import { Transaccion } from '../../historial/interface/transaccion.interface';
import { Usuario } from '../../ajustes/interface/usuario.interface';

const API_URL = 'http://localhost:3000';
const UID = 'qeCnjAUIsgdaXII7TjfZF4QGgOd2';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly uid = UID;

  private readonly usersState = signal<Usuario[]>([]);
  private readonly categoriesState = signal<CategoriaPresupuesto[]>([]);
  private readonly transactionsState = signal<Transaccion[]>([]);
  readonly selectedCategory = signal('Comida');

  readonly categories = computed(() => this.categoriesState());
  readonly allTransactions = computed(() => this.transactionsState());
  readonly summary = computed(() => this.buildSummary());

  readonly selectedCategoryData = computed(() => {
    const currentCategory = this.selectedCategory();
    const category = this.categoriesState().find((item) => item.nombre === currentCategory) ?? this.categoriesState()[0];
    return this.buildCategoryMetrics(category, this.transactionsState(), this.summary().budget);
  });

  readonly filteredTransactions = computed(() => {
    const category = this.selectedCategory();
    return this.transactionsState().filter((item) => item.categoriaNombre === category || category === 'Todas');
  });

  get transactions() {
    return this.filteredTransactions;
  }

  private get currentUser() {
    return this.usersState()[0] ?? null;
  }

  constructor() {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.http.get<Usuario>(`${this.apiUrl}/usuarios/${this.uid}`).subscribe({
      next: (data) => {
        this.usersState.set([data]);
        this.fetchCategories();
        this.fetchTransactions();
      },
      error: (error: unknown) => console.error('Error loading users:', error)
    });
  }

  fetchCategories(): void {
    this.http.get<CategoriaPresupuesto[]>(`${this.apiUrl}/usuarios/${this.uid}/categorias`).subscribe({
      next: (data) => this.categoriesState.set(data.map((category) => this.normalizeCategory(category, this.currentUser?.presupuesto ?? 0))),
      error: (error: unknown) => console.error('Error fetching categories:', error)
    });
  }

  fetchTransactions(): void {
    this.http.get<Transaccion[]>(`${this.apiUrl}/usuarios/${this.uid}/transacciones`).subscribe({
      next: (data) => this.transactionsState.set(data.map((transaction) => ({ ...transaction, fecha: new Date(transaction.fecha) }))),
      error: (error: unknown) => console.error('Error fetching transactions:', error)
    });
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  addCategory(category: Omit<CategoriaPresupuesto, 'id' | 'spent' | 'trend'>) {
    return this.http.post<CategoriaPresupuesto>(`${this.apiUrl}/usuarios/${this.uid}/categorias`, category).pipe(
      tap(() => this.fetchCategories())
    );
  }

  updateCategory(categoryId: string, category: Partial<CategoriaPresupuesto>) {
    return this.http.patch<CategoriaPresupuesto>(`${this.apiUrl}/usuarios/${this.uid}/categorias/${categoryId}`, category).pipe(
      tap(() => this.fetchCategories())
    );
  }

  addTransaction(transaction: any) {
    return this.http.post<Transaccion>(`${this.apiUrl}/usuarios/${this.uid}/transacciones`, transaction).pipe(
      tap(() => this.fetchTransactions()),
      switchMap(() => this.updateBalance(transaction.monto))
    );
  }

  updateBalance(amount: number) {
    const current = this.currentUser;
    if (!current) {
      throw new Error('Usuario no cargado');
    }

    const newSaldo = current.saldo + amount;
    return this.http.patch<Usuario>(`${this.apiUrl}/usuarios/${this.uid}`, { saldo: newSaldo }).pipe(
      tap((user) => this.usersState.set([user]))
    );
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

    return {
      balance: user.saldo,
      budget,
      spent,
      savings,
      monthlyIncome: 0
    };
  }

  private buildCategoryMetrics(category: CategoriaPresupuesto | undefined, transactions: Transaccion[], budget: number) {
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

    const spent = transactions
      .filter((transaction) => !transaction.esIngreso && transaction.categoriaNombre === category.nombre)
      .reduce((acc, transaction) => acc + Math.abs(transaction.monto), 0);
    const limit = category.limiteMonto ?? Math.round(budget * (category.porcentajeLimite / 100));
    const trend = limit > 0 ? `${Math.min(Math.round((spent / limit) * 100), 100)}% usado` : '';

    return {
      ...category,
      spent,
      trend
    };
  }

  private normalizeCategory(category: CategoriaPresupuesto, budget: number): CategoriaPresupuesto {
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

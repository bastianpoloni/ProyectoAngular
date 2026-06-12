import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { CategoriaPresupuesto } from '../../categorias/interface/categoria-presupuesto.interface';
import { VistaPrevia } from '../interface/vista-previa.interface';
import { Transaccion } from '../../historial/interface/transaccion.interface';
import { Usuario } from '../../ajustes/interface/usuario.interface';
import { ResumenBilletera } from '../interface/resumen-billetera.interface';

const API_URL = 'http://localhost:3000';
const UID = 'qeCnjAUIsgdaXII7TjfZF4QGgOd2';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_URL;
  private readonly uid = UID;

  private readonly usersState = signal<Usuario[]>([]);
  private readonly categoriesState = signal<CategoriaPresupuesto[]>([]);
  private readonly transactionsState = signal<Transaccion[]>([]);

  readonly summary = computed(() => this.buildSummary());
  readonly transactions = computed(() => this.transactionsState());
  readonly topCategories = computed(() => {
    const transactions = this.transactionsState();
    return this.categoriesState()
      .map((category) => this.buildCategoryMetrics(category, transactions, this.summary().budget))
      .sort((left, right) => right.spent - left.spent)
      .slice(0, 3);
  });
  readonly previews = computed<VistaPrevia[]>(() => this.buildScreenPreviews());
  readonly savingsRate = computed(() => {
    const summary = this.summary();
    return summary.budget > 0 ? Math.round((summary.savings / summary.budget) * 100) : 0;
  });

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

  private fetchCategories(): void {
    this.http.get<CategoriaPresupuesto[]>(`${this.apiUrl}/usuarios/${this.uid}/categorias`).subscribe({
      next: (data) => this.categoriesState.set(data.map((category) => this.normalizeCategory(category, this.summary().budget))),
      error: (error: unknown) => console.error('Error fetching categories:', error)
    });
  }

  private fetchTransactions(): void {
    this.http.get<Transaccion[]>(`${this.apiUrl}/usuarios/${this.uid}/transacciones`).subscribe({
      next: (data) => this.transactionsState.set(data.map((transaction) => ({ ...transaction, fecha: new Date(transaction.fecha) }))),
      error: (error: unknown) => console.error('Error fetching transactions:', error)
    });
  }

  private buildSummary(): ResumenBilletera {
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

    return { ...category, spent, trend };
  }

  private buildScreenPreviews(): VistaPrevia[] {
    return [
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
    ];
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

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { tap } from 'rxjs';

import { BudgetCategory } from '../../categorias/interfaces/category';
import { User, WalletSummary } from '../interfaces/user';
import { environment } from '../../../../environments/environment';
import { WalletService } from '../../../shared/services/wallet.service';

@Injectable({ providedIn: 'root' })
export class Ajustes {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly walletService = inject(WalletService);

  get uid(): string {
    return this.walletService.currentWalletUid();
  }

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
      .reduce((acc, t) => acc + Math.abs(t.monto), 0);
  });

  readonly summary = computed<WalletSummary>(() => {
    const user = this.usersState().length > 0 ? this.usersState()[0] : null;
    if (!user) return { balance: 0, budget: 0, spent: 0, savings: 0 };
    
    const isShared = this.walletService.isSharedActive();
    const budget = isShared 
      ? (this.walletService.sharedWalletInfo()?.presupuestoCompartido || 0)
      : (user.presupuesto || 0);

    const spent = this.totalSpent();
    const balance = budget - spent;
    
    const allTransactions = this.transactionsState();
    const categoriesSpent = this.categoriesState().reduce((sum, category) => {
      const categorySpent = allTransactions
        .filter(t => !t.esIngreso && t.categoriaNombre === category.nombre)
        .reduce((acc, t) => acc + Math.abs(t.monto), 0);
      return sum + categorySpent;
    }, 0);
    const savings = budget - categoriesSpent;

    return { balance, budget, spent, savings };
  });

  constructor() {
    effect(() => {
      const _ = this.walletService.activeWallet();
      this.loadUsers();
      this.fetchCategories();
      this.fetchTransactions();
    });
  }

  private loadUsers(): void {
    const userId = this.uid;
    if (!userId) return;
    this.usersLoadingState.set(true);
    this.usersErrorState.set(null);
    this.http.get<User>(`${this.apiUrl}/usuarios/${userId}`).subscribe({
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
    const userId = this.uid;
    if (!userId) return;
    const isShared = this.walletService.isSharedActive();
    const endpoint = isShared ? 'categorias-compartidas' : 'categorias';
    this.http.get<BudgetCategory[]>(`${this.apiUrl}/usuarios/${userId}/${endpoint}`).subscribe({
      next: (data) => this.categoriesState.set(data.map(category => this.normalizeCategory(category))),
      error: (error) => console.error('Error fetching categories:', error)
    });
  }

  fetchTransactions(): void {
    const userId = this.uid;
    if (!userId) return;
    const isShared = this.walletService.isSharedActive();
    const endpoint = isShared ? 'transacciones-compartidas' : 'transacciones';
    this.http.get<any[]>(`${this.apiUrl}/usuarios/${userId}/${endpoint}`).subscribe({
      next: (data) => this.transactionsState.set(data.map(t => ({ ...t, fecha: new Date(t.fecha) }))),
      error: (error) => console.error('Error fetching transactions:', error)
    });
  }



  updateBudget(budget: number) {
    const userId = this.uid;
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }
    const isShared = this.walletService.isSharedActive();
    if (isShared) {
      return this.http.patch<any>(`${this.apiUrl}/usuarios/${userId}/shared-wallet-info`, { presupuestoCompartido: budget }).pipe(
        tap((info) => {
          this.walletService.sharedWalletInfo.set(info);
        })
      );
    } else {
      return this.http.patch<User>(`${this.apiUrl}/usuarios/${userId}`, { presupuesto: budget }).pipe(
        tap((user) => this.usersState.set([user]))
      );
    }
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

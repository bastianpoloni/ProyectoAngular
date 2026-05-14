import { Injectable, computed, signal } from '@angular/core';

import {
  BudgetCategory,
  ScreenPreview,
  TimelineEntry,
  TransactionEntry,
  WalletSummary
} from '../../interfaces/billetera.interface';

@Injectable({ providedIn: 'root' })
export class BilleteraService {
  private readonly summaryState = signal<WalletSummary>({
    balance: 4500,
    budget: 4500,
    spent: 350,
    savings: 680,
    monthlyIncome: 5200
  });

  private readonly categoryState = signal<BudgetCategory[]>([
    { name: 'Comida', icon: '🍽', accent: '#68b95b', spent: 350, limit: 500, trend: '+12% vs. semana pasada' },
    { name: 'Transporte', icon: '🚌', accent: '#4a84b7', spent: 350, limit: 500, trend: 'Controlado' },
    { name: 'Ocio', icon: '🎟', accent: '#f1a8cb', spent: 250, limit: 500, trend: 'Ligero exceso' },
    { name: 'Hogar', icon: '🏠', accent: '#d5ae64', spent: 180, limit: 400, trend: 'Por debajo del límite' },
    { name: 'Ahorro', icon: '🐖', accent: '#7bc96f', spent: 680, limit: 800, trend: 'Meta mensual activa' },
    { name: 'Salud', icon: '🩺', accent: '#88c0d0', spent: 95, limit: 300, trend: 'Disponible' }
  ]);

  private readonly transactionState = signal<TransactionEntry[]>([
    { concept: 'Comida', category: 'Comida', date: '23/07/2023', amount: -350, note: 'Supermercado semanal' },
    { concept: 'Descripción', category: 'Ocio', date: '23/03/2023', amount: -120, note: 'Salida con amigos' },
    { concept: 'Ingreso freelance', category: 'Ingresos', date: '21/03/2023', amount: 1200, note: 'Proyecto UI' },
    { concept: 'Comida', category: 'Comida', date: '18/03/2023', amount: -30, note: 'Café y snack' },
    { concept: 'Transporte', category: 'Transporte', date: '16/03/2023', amount: -48, note: 'Metro y bus' },
    { concept: 'Ahorro automático', category: 'Ahorro', date: '15/03/2023', amount: -200, note: 'Transferencia programada' }
  ]);

  private readonly timelineState = signal<TimelineEntry[]>([
    { label: 'Lu', income: 240, expense: 60 },
    { label: 'Ma', income: 180, expense: 180 },
    { label: 'Mi', income: 320, expense: 90 },
    { label: 'Ju', income: 140, expense: 220 },
    { label: 'Vi', income: 260, expense: 120 },
    { label: 'Sa', income: 180, expense: 300 },
    { label: 'Do', income: 90, expense: 80 }
  ]);

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

  readonly summary = computed(() => this.summaryState());
  readonly categories = computed(() => this.categoryState());
  readonly transactions = computed(() => this.transactionState());
  readonly timeline = computed(() => this.timelineState());
  readonly previews = computed(() => this.screenState());

  readonly topCategories = computed(() =>
    this.categoryState()
      .slice()
      .sort((left, right) => right.spent - left.spent)
      .slice(0, 4)
  );

  readonly categoryLabels = computed(() => this.categoryState().map((item) => item.name));
  readonly totalSpent = computed(() => this.categoryState().reduce((accumulator, item) => accumulator + item.spent, 0));

  readonly savingsRate = computed(() => {
    const summary = this.summaryState();
    return Math.round((summary.savings / summary.monthlyIncome) * 100);
  });

  readonly selectedCategory = signal('Comida');
  readonly historyMode = signal<'Temporal' | 'Categoría'>('Categoría');

  readonly selectedCategoryData = computed(() => {
    const currentCategory = this.selectedCategory();
    return this.categoryState().find((item) => item.name === currentCategory) ?? this.categoryState()[0];
  });

  readonly filteredTransactions = computed(() => {
    const category = this.selectedCategory();
    return this.transactionState().filter((item) => item.category === category || category === 'Todas');
  });

  readonly categoryOptions = computed(() => ['Todas', ...this.categoryLabels()]);

  setSelectedCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  setHistoryMode(mode: 'Temporal' | 'Categoría'): void {
    this.historyMode.set(mode);
  }
}

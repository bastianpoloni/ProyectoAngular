import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { ClpCurrencyPipe } from '../../../../shared/pipes/clp-currency.pipe';
import { Categorias } from '../../services/categorias.service';
import { BudgetCategory } from '../../interfaces/category';

export interface PredefinedCategory {
  nombre: string;
  emojis: string[];
}

export const PREDEFINED_CATEGORIES: PredefinedCategory[] = [
  { nombre: 'Comida', emojis: ['🍔', '🍲'] },
  { nombre: 'Transporte', emojis: ['🚗', '🚌'] },
  { nombre: 'Entretenimiento', emojis: ['🎬', '🎮'] },
  { nombre: 'Ocio', emojis: ['🎉', '🍻', '✈️'] },
  { nombre: 'Sueldo', emojis: ['💰', '💼', '💵'] },
  { nombre: 'Salud', emojis: ['🏥', '💊', '🩺'] },
  { nombre: 'Servicios', emojis: ['💡', '🔌', '💧'] },
  { nombre: 'Educación', emojis: ['📚', '🎓', '✏️'] },
  { nombre: 'Otros', emojis: ['💸', '🏷️', '📦'] }
];

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [RouterLink, ClpCurrencyPipe, DatePipe],
  templateUrl: './categorias.component.html',
  styleUrl: './categorias.component.css'
})
export class CategoriesComponent {
  private readonly svc = inject(Categorias);

  protected readonly categories = this.svc.categories;
  protected readonly selectedCategory = this.svc.selectedCategory;
  protected readonly selectedCategoryData = this.svc.selectedCategoryData;
  protected readonly transactions = this.svc.transactions;

  searchTerm = signal('');

  // Predefined Categories static list
  predefinedCategories: PredefinedCategory[] = PREDEFINED_CATEGORIES;

  // Add category states
  selectedAddPredefinedName = signal('Comida');
  selectedAddEmoji = signal('🍔');

  // Edit category states
  isEditingCategory = false;
  editingCategoryData = signal<BudgetCategory | null>(null);
  selectedEditPredefinedName = signal('Comida');
  selectedEditEmoji = signal('🍔');

  // Saving feedback states
  isSavingAdd = signal(false);
  isSavingEdit = signal(false);
  saveSuccessAdd = signal(false);
  saveSuccessEdit = signal(false);

  // Canceling feedback states
  isCancelingAdd = signal(false);
  isCancelingEdit = signal(false);

  // Delete category states
  isConfirmingDelete = signal(false);
  categoryToDelete = signal<BudgetCategory | null>(null);
  isDeleting = signal(false);

  get userBudget(): number {
    return this.svc.summary().budget;
  }

  filteredCategories = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const all = this.categories();
    if (!term) return all;
    return all.filter(c => c.nombre.toLowerCase().includes(term));
  });

  isAddingTransaction = false;
  isAddingCategory = false;

  get maxPorcentajePermitido(): number {
    const totalCurrent = this.categories().reduce((sum, c) => {
      let val = c.porcentajeLimite || 0;
      if (val > 0 && val <= 1) val = val * 100; // Normalize 0.3 to 30
      return sum + val;
    }, 0);
    return Math.max(0, 100 - totalCurrent);
  }

  maxPorcentajePermitidoEdicion(currentCategory: BudgetCategory): number {
    const totalCurrent = this.categories().reduce((sum, c) => {
      let val = c.porcentajeLimite || 0;
      if (val > 0 && val <= 1) val = val * 100;
      return sum + val;
    }, 0);
    const normalizedCurrent = currentCategory.porcentajeLimite > 0 && currentCategory.porcentajeLimite <= 1 
      ? currentCategory.porcentajeLimite * 100 
      : (currentCategory.porcentajeLimite || 0);
    return Math.max(0, 100 - (totalCurrent - normalizedCurrent));
  }

  getPreviewAmount(porcentajeStr: string): number {
    const p = Number(porcentajeStr) || 0;
    return (this.userBudget * p) / 100;
  }

  selectCategory(category: string): void {
    this.svc.selectCategory(category);
    this.isAddingTransaction = false;
  }

  cancelAdd(): void {
    this.isCancelingAdd.set(true);
    setTimeout(() => {
      this.isAddingCategory = false;
      this.isCancelingAdd.set(false);
      this.selectedAddPredefinedName.set('Comida');
      this.selectedAddEmoji.set('🍔');
    }, 250);
  }

  cancelEdit(): void {
    this.isCancelingEdit.set(true);
    setTimeout(() => {
      this.isEditingCategory = false;
      this.editingCategoryData.set(null);
      this.isCancelingEdit.set(false);
    }, 250);
  }

  addTransaction(desc: string, montoStr: string) {
    const montoRaw = Number(montoStr);
    if (!desc || isNaN(montoRaw) || montoRaw === 0) return;

    const isIngreso = this.selectedCategoryData().esIngreso ?? false;
    const monto = isIngreso ? Math.abs(montoRaw) : -Math.abs(montoRaw);

    this.svc.addTransaction({
      categoriaNombre: this.selectedCategory(),
      descripcion: desc,
      monto: monto,
      esIngreso: isIngreso,
      fecha: new Date()
    }).subscribe(() => {
      this.isAddingTransaction = false;
    });
  }

  getUsed(category: any): number {
    const allTxs = this.svc.allTransactions();
    const sum = allTxs
      .filter((t) => t.categoriaNombre === category.nombre)
      .reduce((acc, t) => acc + Math.abs(t.monto), 0);
    return sum;
  }

  getPercentageUsed(category: any): number {
    const used = this.getUsed(category);
    const limit = category.limiteMonto || 1; // Prevent division by zero
    return Math.min((used / limit) * 100, 100);
  }

  onAddPredefinedCategoryChange(name: string): void {
    this.selectedAddPredefinedName.set(name);
    const cat = PREDEFINED_CATEGORIES.find(c => c.nombre === name);
    if (cat && cat.emojis.length > 0) {
      this.selectedAddEmoji.set(cat.emojis[0]);
    }
  }

  onEditPredefinedCategoryChange(name: string): void {
    this.selectedEditPredefinedName.set(name);
    const cat = PREDEFINED_CATEGORIES.find(c => c.nombre === name);
    if (cat && cat.emojis.length > 0) {
      this.selectedEditEmoji.set(cat.emojis[0]);
    }
  }

  getEmojisForCategory(name: string): string[] {
    const cat = PREDEFINED_CATEGORIES.find(c => c.nombre === name);
    return cat ? cat.emojis : ['💸', '🏷️', '📦'];
  }

  guessPredefinedCategory(name: string, icon: string): string {
    const n = name.toLowerCase();
    
    // Check if the icon matches any predefined emoji
    let matched = PREDEFINED_CATEGORIES.find(c => c.emojis.includes(icon));
    if (matched) return matched.nombre;

    // Check exact name match first
    matched = PREDEFINED_CATEGORIES.find(c => c.nombre.toLowerCase() === n);
    if (matched) return matched.nombre;

    // Custom keyword matching
    if (n.includes('play') || n.includes('ocio') || n.includes('diversion') || n.includes('juego') || n.includes('consola') || n.includes('playstation') || n.includes('xbox') || n.includes('switch')) {
      return 'Ocio';
    }
    if (n.includes('comida') || n.includes('almuerzo') || n.includes('cena') || n.includes('desayuno') || n.includes('restaurant') || n.includes('ñam') || n.includes('pizza') || n.includes('hamburguesa')) {
      return 'Comida';
    }
    if (n.includes('viaje') || n.includes('transporte') || n.includes('auto') || n.includes('bus') || n.includes('metro') || n.includes('bici') || n.includes('colectivo') || n.includes('uber')) {
      return 'Transporte';
    }
    if (n.includes('cine') || n.includes('netflix') || n.includes('pelicula') || n.includes('entretenimiento') || n.includes('popcorn') || n.includes('series')) {
      return 'Entretenimiento';
    }
    if (n.includes('sueldo') || n.includes('trabajo') || n.includes('ingreso') || n.includes('remuneracion') || n.includes('pago')) {
      return 'Sueldo';
    }
    if (n.includes('salud') || n.includes('medico') || n.includes('farmacia') || n.includes('doctor') || n.includes('remedio') || n.includes('clinica')) {
      return 'Salud';
    }
    if (n.includes('luz') || n.includes('agua') || n.includes('gas') || n.includes('internet') || n.includes('servicio') || n.includes('cuenta')) {
      return 'Servicios';
    }
    if (n.includes('colegio') || n.includes('universidad') || n.includes('curso') || n.includes('estudio') || n.includes('educacion') || n.includes('libro')) {
      return 'Educación';
    }

    return 'Otros';
  }

  // Trigger editing a category
  editCategory(event: Event, category: BudgetCategory): void {
    event.stopPropagation(); // Stop card selection click
    this.editingCategoryData.set(category);
    
    // Guess category from name/icon
    const guessedName = this.guessPredefinedCategory(category.nombre, category.icono);
    this.selectedEditPredefinedName.set(guessedName);
    
    const matchedPredef = PREDEFINED_CATEGORIES.find(c => c.nombre === guessedName);
    if (matchedPredef) {
      if (matchedPredef.emojis.includes(category.icono)) {
        this.selectedEditEmoji.set(category.icono);
      } else {
        this.selectedEditEmoji.set(matchedPredef.emojis[0]);
      }
    } else {
      this.selectedEditEmoji.set(category.icono || '✏️');
    }
    this.isEditingCategory = true;
  }

  addCategory(nombre: string, porcentajeStr: string, esIngreso: boolean, icono: string, color: string) {
    if (!nombre) {
      alert('Por favor, ingresa un nombre para la categoría.');
      return;
    }
    let porcentaje = Number(porcentajeStr);
    if (isNaN(porcentaje)) porcentaje = 0;
    
    // Prevent exceeding max percentage
    if (porcentaje > this.maxPorcentajePermitido) {
      alert(`El porcentaje supera el límite permitido. Máximo disponible: ${this.maxPorcentajePermitido}%`);
      return;
    }

    const limiteMonto = (this.userBudget * porcentaje) / 100;

    this.isSavingAdd.set(true);

    this.svc.addCategory({
      nombre,
      porcentajeLimite: porcentaje,
      esIngreso,
      icono,
      color,
      limiteMonto
    }).subscribe({
      next: () => {
        this.saveSuccessAdd.set(true);
        setTimeout(() => {
          this.isAddingCategory = false;
          // Reset states
          this.isSavingAdd.set(false);
          this.saveSuccessAdd.set(false);
          this.selectedAddPredefinedName.set('Comida');
          this.selectedAddEmoji.set('🍔');
        }, 800);
      },
      error: (err) => {
        this.isSavingAdd.set(false);
        alert('Error al guardar la categoría.');
        console.error('Error al guardar la categoría:', err);
      }
    });
  }

  saveEditedCategory(
    category: BudgetCategory,
    nombre: string,
    porcentajeStr: string,
    icono: string,
    color: string
  ): void {
    if (!nombre) {
      alert('Por favor, ingresa un nombre para la categoría.');
      return;
    }
    const porcentaje = Number(porcentajeStr) || 0;
    const maxVal = this.maxPorcentajePermitidoEdicion(category);
    if (porcentaje > maxVal) {
      alert(`El porcentaje supera el límite permitido. Máximo disponible: ${maxVal}%`);
      return;
    }

    const limiteMonto = (this.userBudget * porcentaje) / 100;

    this.isSavingEdit.set(true);

    this.svc.updateCategory(category.id, {
      nombre,
      porcentajeLimite: porcentaje,
      icono,
      color,
      limiteMonto
    }).subscribe({
      next: () => {
        this.saveSuccessEdit.set(true);
        setTimeout(() => {
          this.isEditingCategory = false;
          this.editingCategoryData.set(null);
          this.isSavingEdit.set(false);
          this.saveSuccessEdit.set(false);
        }, 800);
      },
      error: (err) => {
        this.isSavingEdit.set(false);
        alert('Error al guardar los cambios de la categoría.');
        console.error('Error al guardar la categoría:', err);
      }
    });
  }

  deleteCategory(event: Event, category: BudgetCategory): void {
    event.stopPropagation(); // Stop card selection click
    this.categoryToDelete.set(category);
    this.isConfirmingDelete.set(true);
  }

  confirmDeleteCategory(): void {
    const category = this.categoryToDelete();
    if (!category || !category.id) return;

    this.isDeleting.set(true);
    this.svc.deleteCategory(category.id).subscribe({
      next: () => {
        // If the deleted category was currently selected, select another one
        if (this.svc.selectedCategory() === category.nombre) {
          const remaining = this.svc.categories().filter(c => c.id !== category.id);
          if (remaining.length > 0) {
            this.svc.selectCategory(remaining[0].nombre);
          } else {
            this.svc.selectCategory('');
          }
        }
        this.closeDeleteModal();
      },
      error: (err) => {
        alert('Error al eliminar la categoría.');
        console.error('Error deleting category:', err);
        this.isDeleting.set(false);
      }
    });
  }

  closeDeleteModal(): void {
    this.isConfirmingDelete.set(false);
    this.categoryToDelete.set(null);
    this.isDeleting.set(false);
  }
}

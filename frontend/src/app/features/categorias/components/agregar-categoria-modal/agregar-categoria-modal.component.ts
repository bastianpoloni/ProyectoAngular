import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { Categorias } from '../../services/categorias.service';
import { PREDEFINED_CATEGORIES, PredefinedCategory } from '../../constants/predefined-categories';
import { ClpCurrencyPipe } from '../../../../shared/pipes/clp-currency.pipe';

@Component({
  selector: 'app-agregar-categoria-modal',
  standalone: true,
  imports: [ClpCurrencyPipe],
  templateUrl: './agregar-categoria-modal.component.html',
  styleUrl: './agregar-categoria-modal.component.css'
})
export class AgregarCategoriaModalComponent {
  private readonly svc = inject(Categorias);

  @Input() userBudget = 0;
  @Input() maxPorcentajePermitido = 100;
  @Output() close = new EventEmitter<void>();

  protected readonly predefinedCategories: PredefinedCategory[] = PREDEFINED_CATEGORIES;
  protected readonly selectedAddPredefinedName = signal('Comida');
  protected readonly selectedAddEmoji = signal('🍔');

  protected readonly isSavingAdd = signal(false);
  protected readonly saveSuccessAdd = signal(false);
  protected readonly isCancelingAdd = signal(false);

  protected getPreviewAmount(porcentajeStr: string): number {
    const p = Number(porcentajeStr) || 0;
    return (this.userBudget * p) / 100;
  }

  protected onAddPredefinedCategoryChange(name: string): void {
    this.selectedAddPredefinedName.set(name);
    const cat = this.predefinedCategories.find(c => c.nombre === name);
    if (cat && cat.emojis.length > 0) {
      this.selectedAddEmoji.set(cat.emojis[0]);
    }
  }

  protected getEmojisForCategory(name: string): string[] {
    const cat = this.predefinedCategories.find(c => c.nombre === name);
    return cat ? cat.emojis : ['💸', '🏷️', '📦'];
  }

  protected cancelAdd(): void {
    this.isCancelingAdd.set(true);
    setTimeout(() => {
      this.isCancelingAdd.set(false);
      this.close.emit();
    }, 250);
  }

  protected addCategory(nombre: string, porcentajeStr: string, esIngreso: boolean, icono: string, color: string): void {
    if (!nombre.trim()) {
      alert('Por favor, ingresa un nombre para la categoría.');
      return;
    }
    let porcentaje = Number(porcentajeStr);
    if (isNaN(porcentaje)) porcentaje = 0;
    
    if (porcentaje > this.maxPorcentajePermitido) {
      alert(`El porcentaje supera el límite permitido. Máximo disponible: ${this.maxPorcentajePermitido}%`);
      return;
    }

    const limiteMonto = (this.userBudget * porcentaje) / 100;

    this.isSavingAdd.set(true);

    this.svc.addCategory({
      nombre: nombre.trim(),
      porcentajeLimite: porcentaje,
      esIngreso,
      icono,
      color,
      limiteMonto
    }).subscribe({
      next: () => {
        this.saveSuccessAdd.set(true);
        setTimeout(() => {
          this.isSavingAdd.set(false);
          this.saveSuccessAdd.set(false);
          this.close.emit();
        }, 800);
      },
      error: (err) => {
        this.isSavingAdd.set(false);
        alert('Error al guardar la categoría.');
        console.error('Error al guardar la categoría:', err);
      }
    });
  }
}

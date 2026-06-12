import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { Categorias } from '../../services/categorias.service';
import { BudgetCategory } from '../../interfaces/category';
import { PREDEFINED_CATEGORIES, PredefinedCategory } from '../../constants/predefined-categories';
import { ClpCurrencyPipe } from '../../../../shared/pipes/clp-currency.pipe';

@Component({
  selector: 'app-editar-categoria-modal',
  standalone: true,
  imports: [ClpCurrencyPipe],
  templateUrl: './editar-categoria-modal.component.html',
  styleUrl: './editar-categoria-modal.component.css'
})
export class EditarCategoriaModalComponent implements OnInit {
  private readonly svc = inject(Categorias);

  @Input() category!: BudgetCategory;
  @Input() maxPorcentajePermitidoEdicion = 100;
  @Input() userBudget = 0;
  @Output() close = new EventEmitter<void>();

  protected readonly predefinedCategories: PredefinedCategory[] = PREDEFINED_CATEGORIES;
  protected readonly selectedEditPredefinedName = signal('Comida');
  protected readonly selectedEditEmoji = signal('🍔');

  protected readonly isSavingEdit = signal(false);
  protected readonly saveSuccessEdit = signal(false);
  protected readonly isCancelingEdit = signal(false);

  ngOnInit(): void {
    if (this.category) {
      const guessedName = this.guessPredefinedCategory(this.category.nombre, this.category.icono);
      this.selectedEditPredefinedName.set(guessedName);
      
      const matchedPredef = this.predefinedCategories.find(c => c.nombre === guessedName);
      if (matchedPredef) {
        if (matchedPredef.emojis.includes(this.category.icono)) {
          this.selectedEditEmoji.set(this.category.icono);
        } else {
          this.selectedEditEmoji.set(matchedPredef.emojis[0]);
        }
      } else {
        this.selectedEditEmoji.set(this.category.icono || '✏️');
      }
    }
  }

  protected getPreviewAmount(porcentajeStr: string): number {
    const p = Number(porcentajeStr) || 0;
    return (this.userBudget * p) / 100;
  }

  protected onEditPredefinedCategoryChange(name: string): void {
    this.selectedEditPredefinedName.set(name);
    const cat = this.predefinedCategories.find(c => c.nombre === name);
    if (cat && cat.emojis.length > 0) {
      this.selectedEditEmoji.set(cat.emojis[0]);
    }
  }

  protected getEmojisForCategory(name: string): string[] {
    const cat = this.predefinedCategories.find(c => c.nombre === name);
    return cat ? cat.emojis : ['💸', '🏷️', '📦'];
  }

  protected cancelEdit(): void {
    this.isCancelingEdit.set(true);
    setTimeout(() => {
      this.isCancelingEdit.set(false);
      this.close.emit();
    }, 250);
  }

  protected guessPredefinedCategory(name: string, icon: string): string {
    const n = name.toLowerCase();
    let matched = this.predefinedCategories.find(c => c.emojis.includes(icon));
    if (matched) return matched.nombre;

    matched = this.predefinedCategories.find(c => c.nombre.toLowerCase() === n);
    if (matched) return matched.nombre;

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

  protected saveEditedCategory(nombre: string, porcentajeStr: string, icono: string, color: string): void {
    if (!nombre.trim()) {
      alert('Por favor, ingresa un nombre para la categoría.');
      return;
    }
    const porcentaje = Number(porcentajeStr) || 0;
    if (porcentaje > this.maxPorcentajePermitidoEdicion) {
      alert(`El porcentaje supera el límite permitido. Máximo disponible: ${this.maxPorcentajePermitidoEdicion}%`);
      return;
    }

    const limiteMonto = (this.userBudget * porcentaje) / 100;

    this.isSavingEdit.set(true);

    this.svc.updateCategory(this.category.id, {
      nombre: nombre.trim(),
      porcentajeLimite: porcentaje,
      icono,
      color,
      limiteMonto
    }).subscribe({
      next: () => {
        this.saveSuccessEdit.set(true);
        setTimeout(() => {
          this.isSavingEdit.set(false);
          this.saveSuccessEdit.set(false);
          this.close.emit();
        }, 800);
      },
      error: (err) => {
        this.isSavingEdit.set(false);
        alert('Error al guardar los cambios de la categoría.');
        console.error('Error al guardar la categoría:', err);
      }
    });
  }
}

import { Component, EventEmitter, Output, inject, signal, computed, OnInit } from '@angular/core';
import { Dashboard } from '../../services/dashboard.service';

@Component({
  selector: 'app-add-expense-modal',
  standalone: true,
  imports: [],
  templateUrl: './add-expense-modal.component.html',
  styleUrl: './add-expense-modal.component.css'
})
export class AddExpenseModalComponent implements OnInit {
  private readonly svc = inject(Dashboard);

  @Output() close = new EventEmitter<void>();

  protected readonly errorMessage = signal('');
  protected readonly allCategories = computed(() => this.svc.categories().filter(c => !c.esIngreso));

  ngOnInit(): void {
    this.svc.fetchCategories();
  }

  protected cancel(): void {
    this.close.emit();
  }

  protected save(desc: string, amountVal: string, catName: string): void {
    const amountNum = Number(amountVal);
    if (!desc.trim()) {
      this.errorMessage.set('La descripción es obligatoria.');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      this.errorMessage.set('El monto debe ser un número mayor a cero.');
      return;
    }
    if (!catName) {
      this.errorMessage.set('Debes seleccionar una categoría.');
      return;
    }

    this.svc.addTransaction({
      categoriaNombre: catName,
      descripcion: desc.trim(),
      monto: -Math.abs(amountNum), // Negative because it's an expense
      esIngreso: false,
      fecha: new Date()
    }).subscribe({
      next: () => {
        this.close.emit();
      },
      error: (err) => {
        console.error('Error saving expense:', err);
        this.errorMessage.set('Error al guardar el gasto. Intenta de nuevo.');
      }
    });
  }
}

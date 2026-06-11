import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ClpCurrencyPipe } from '../../../../shared/pipes/clp-currency.pipe';
import { Ajustes } from '../../services/ajustes';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ClpCurrencyPipe],
  templateUrl: './ajustes.component.html',
  styleUrl: './ajustes.component.css'
})
export class SettingsComponent {
  private readonly svc = inject(Ajustes);

  protected readonly summary = this.svc.summary;
  protected readonly categories = this.svc.categories;
  protected readonly users = this.svc.users;
  protected readonly usersLoading = this.svc.usersLoading;
  protected readonly usersError = this.svc.usersError;
  protected readonly currentUser = this.svc.currentUser;

  protected addBalance(amountInput: HTMLInputElement) {
    const value = Number(amountInput.value);
    if (!value || value <= 0) {
      return;
    }
    this.svc.addBalance(value).subscribe({
      next: () => {
        alert(`Se han agregado $${value} al saldo exitosamente.`);
        amountInput.value = '';
      },
      error: (err) => {
        alert('Error al agregar saldo.');
        console.error('Error al agregar saldo:', err);
      }
    });
  }

  protected setBudget(budgetInput: HTMLInputElement) {
    const value = Number(budgetInput.value);
    if (!value || value <= 0) {
      return;
    }
    this.svc.setBudget(value).subscribe({
      next: () => {
        alert(`El presupuesto mensual se ha actualizado a $${value}.`);
        budgetInput.value = '';
      },
      error: (err) => {
        alert('Error al actualizar el presupuesto.');
        console.error('Error al actualizar presupuesto:', err);
      }
    });
  }
}

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SignedCurrencyPipe } from '../../../../shared/pipes/signed-currency.pipe';
import { SettingsService } from '../../services/ajustes.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, SignedCurrencyPipe],
  templateUrl: './ajustes.component.html',
  styleUrl: './ajustes.component.css'
})
export class SettingsComponent {
  private readonly svc = inject(SettingsService);

  protected readonly summary = this.svc.summary;
  protected readonly categories = this.svc.categories;
  protected readonly users = this.svc.users;
  protected readonly usersLoading = this.svc.usersLoading;
  protected readonly usersError = this.svc.usersError;
  protected readonly currentUser = this.svc.currentUser;

  protected addBalance(amount: string) {
    const value = Number(amount);
    if (!value || value <= 0) {
      return;
    }
    this.svc.addBalance(value).subscribe({
      next: () => {},
      error: (err) => console.error('Error al agregar saldo:', err)
    });
  }
}

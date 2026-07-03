import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ClpCurrencyPipe } from '../../../../shared/pipes/clp-currency.pipe';
import { Ajustes } from '../../services/ajustes.service';
import { WalletService } from '../../../../shared/services/wallet.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ClpCurrencyPipe],
  templateUrl: './ajustes.component.html',
  styleUrl: './ajustes.component.css'
})
export class SettingsComponent {
  private readonly svc = inject(Ajustes);
  private readonly walletService = inject(WalletService);

  protected readonly summary = this.svc.summary;
  protected readonly categories = this.svc.categories;
  protected readonly currentUser = this.svc.currentUser;
  
  protected readonly sharedWalletInfo = this.walletService.sharedWalletInfo;
  protected readonly isSharedActive = this.walletService.isSharedActive;

  protected formatAmount(event: Event): void {
    const input = event.target as HTMLInputElement;
    let val = input.value.replace(/\D/g, '');
    if (val) {
      val = Number(val).toLocaleString('es-CL');
    }
    input.value = val;
  }

  protected addBalance(amountInput: HTMLInputElement) {
    const value = Number(amountInput.value.replace(/\D/g, ''));
    if (!value || value <= 0) {
      return;
    }
    this.svc.addBalance(value).subscribe({
      next: () => {
        alert(`Se han agregado $${value.toLocaleString('es-CL')} al saldo exitosamente.`);
        amountInput.value = '';
      },
      error: (err: unknown) => {
        alert('Error al agregar saldo.');
        console.error('Error al agregar saldo:', err);
      }
    });
  }

  protected setBudget(budgetInput: HTMLInputElement) {
    const value = Number(budgetInput.value.replace(/\D/g, ''));
    if (!value || value <= 0) {
      return;
    }
    this.svc.setBudget(value).subscribe({
      next: () => {
        alert(`El presupuesto mensual se ha actualizado a $${value.toLocaleString('es-CL')}.`);
        budgetInput.value = '';
      },
      error: (err: unknown) => {
        alert('Error al actualizar el presupuesto.');
        console.error('Error al actualizar presupuesto:', err);
      }
    });
  }

  protected saveSharedWallet(email: string, budgetStr: string): void {
    const trimmedEmail = (email || '').trim().toLowerCase();
    const budget = Number(budgetStr);
    
    if (!trimmedEmail) {
      alert('Debe ingresar un email válido.');
      return;
    }
    if (isNaN(budget) || budget <= 0) {
      alert('Debe ingresar un presupuesto mensual válido mayor a 0.');
      return;
    }

    this.walletService.saveSharedWalletInfo(trimmedEmail, budget).subscribe({
      next: () => {
        alert('Billetera compartida vinculada con éxito.');
      },
      error: (err: any) => {
        const msg = err.error?.message || 'Error al vincular la billetera compartida.';
        alert(msg);
        console.error('Error sharing wallet:', err);
      }
    });
  }

  protected unlinkSharedWallet(): void {
    if (confirm('¿Está seguro de que desea desvincular la billetera compartida? Se perderá el acceso conjunto.')) {
      this.walletService.saveSharedWalletInfo('', 0).subscribe({
        next: () => {
          alert('Billetera compartida desvinculada.');
          this.walletService.activeWallet.set('personal');
        },
        error: (err: any) => {
          alert('Error al desvincular la billetera.');
          console.error(err);
        }
      });
    }
  }

  protected toggleNotifications(): void {
    const current = this.currentUser();
    if (!current) {
      return;
    }
    const currentVal = current.notificaciones !== false;
    const newVal = !currentVal;

    this.svc.updateNotifications(newVal).subscribe({
      next: () => {
        const status = newVal ? 'activadas' : 'desactivadas';
        console.log(`Preferencias de notificacion actualizadas: ${status}`);
      },
      error: (err: unknown) => {
        alert('Error al actualizar las preferencias de notificacion.');
        console.error('Error updating notifications:', err);
      }
    });
  }

  protected get notificacionesActivas(): boolean {
    const current = this.currentUser();
    return current ? current.notificaciones !== false : true;
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Auth } from '../../features/auth/services/auth';

export interface SharedWalletInfo {
  hasSharedWallet: boolean;
  ownerId?: string;
  sharedEmail?: string;
  sharedName?: string;
  presupuestoCompartido?: number;
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly auth = inject(Auth);

  // Active wallet: 'personal' or 'shared'
  readonly activeWallet = signal<'personal' | 'shared'>('personal');

  // Info of the shared wallet
  readonly sharedWalletInfo = signal<SharedWalletInfo | null>(null);

  // myUid is now a computed signal that reacts to Auth.currentUser shifts
  readonly myUid = computed(() => this.auth.currentUser()?.id || '');

  // UID used for api queries
  readonly currentWalletUid = computed(() => {
    if (this.activeWallet() === 'shared') {
      return this.sharedWalletInfo()?.ownerId || this.myUid();
    }
    return this.myUid();
  });

  // Check if shared wallet is active
  readonly isSharedActive = computed(() => this.activeWallet() === 'shared');

  constructor() {
    effect(() => {
      const myId = this.myUid();
      if (myId) {
        this.loadSharedWalletInfo();
      } else {
        this.sharedWalletInfo.set(null);
        this.activeWallet.set('personal');
      }
    });
  }

  loadSharedWalletInfo(): void {
    const myId = this.myUid();
    if (!myId) return;
    this.http.get<SharedWalletInfo>(`${this.apiUrl}/usuarios/${myId}/shared-wallet-info`).subscribe({
      next: (info) => this.sharedWalletInfo.set(info),
      error: (err) => console.error('Error loading shared wallet info:', err)
    });
  }

  saveSharedWalletInfo(email: string, budget: number) {
    const myId = this.myUid();
    if (!myId) {
      throw new Error('Usuario no autenticado');
    }
    return this.http.patch<SharedWalletInfo>(`${this.apiUrl}/usuarios/${myId}/shared-wallet-info`, {
      emailBilleteraCompartida: email,
      presupuestoCompartido: budget
    }).pipe(
      tap((info) => {
        this.sharedWalletInfo.set(info);
      })
    );
  }

  toggleWallet(): void {
    this.activeWallet.update(w => w === 'personal' ? 'shared' : 'personal');
  }
}

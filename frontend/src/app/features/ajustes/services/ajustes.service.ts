import { Injectable } from '@angular/core';

import { BilleteraService } from '../../../shared/services/billetera.service';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private readonly wallet: BilleteraService) {}

  get summary() {
    return this.wallet.summary;
  }

  get categories() {
    return this.wallet.categories;
  }

  get users() {
    return this.wallet.users;
  }

  get usersLoading() {
    return this.wallet.usersLoading;
  }

  get usersError() {
    return this.wallet.usersError;
  }
}

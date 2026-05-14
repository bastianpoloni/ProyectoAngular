import { Component, inject } from '@angular/core';

import { SignedCurrencyPipe } from '../../../../shared/pipes/signed-currency.pipe';
import { SettingsService } from '../../services/ajustes.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [SignedCurrencyPipe],
  templateUrl: './ajustes.component.html',
  styleUrl: './ajustes.component.css'
})
export class SettingsComponent {
  private readonly svc = inject(SettingsService);

  protected readonly summary = this.svc.summary;
  protected readonly categories = this.svc.categories;
}

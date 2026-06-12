import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from './features/auth/services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly isAutenticated = this.auth.isAutenticated;
  protected readonly title = signal('ChanchitoApp');
  
  protected readonly navigation = [
    { label: 'Inicio', path: '/', icon: '⌂' },
    { label: 'Categorías', path: '/categorias', icon: '◫' },
    { label: 'Detalle', path: '/detalle', icon: '◌' },
    { label: 'Histórico', path: '/historial', icon: '≣' },
    { label: 'Ajustes', path: '/configuracion', icon: '⚙' }
  ];

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

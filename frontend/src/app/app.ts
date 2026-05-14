import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ChanchitoApp');
  protected readonly navigation = [
    { label: 'Inicio', path: '/', icon: '⌂' },
    { label: 'Categorías', path: '/categorias', icon: '◫' },
    { label: 'Detalle', path: '/detalle', icon: '◌' },
    { label: 'Histórico', path: '/historial', icon: '≣' },
    { label: 'Ajustes', path: '/configuracion', icon: '⚙' }
  ];
}

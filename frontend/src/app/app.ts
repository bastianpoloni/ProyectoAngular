import { Component, inject, signal, HostListener } from '@angular/core';
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
  
  // Profile dropdown states
  isProfileMenuOpen = signal(false);
  isChangePasswordOpen = signal(false);
  changePasswordError = signal<string | null>(null);

  // Edit profile name states
  isEditProfileOpen = signal(false);
  editProfileError = signal<string | null>(null);

  protected readonly navigation = [
    { label: 'Inicio', path: '/', icon: '⌂' },
    { label: 'Categorías', path: '/categorias', icon: '◫' },
    { label: 'Detalle', path: '/detalle', icon: '◌' },
    { label: 'Histórico', path: '/historial', icon: '≣' },
    { label: 'Ajustes', path: '/configuracion', icon: '⚙' }
  ];

  protected get userName(): string {
    const user = this.auth.getCurrentUser();
    return user ? user.nombre : 'Usuario';
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.isProfileMenuOpen.update(v => !v);
  }

  @HostListener('document:click')
  closeProfileMenu(): void {
    this.isProfileMenuOpen.set(false);
  }

  openChangePasswordModal(): void {
    this.isProfileMenuOpen.set(false);
    this.changePasswordError.set(null);
    this.isChangePasswordOpen.set(true);
  }

  openEditProfileModal(): void {
    this.isProfileMenuOpen.set(false);
    this.editProfileError.set(null);
    this.isEditProfileOpen.set(true);
  }

  updateProfileName(newName: string): void {
    const trimmed = (newName || '').trim();
    if (!trimmed) {
      this.editProfileError.set('El nombre de usuario no puede estar vacío.');
      return;
    }

    this.auth.updateUser({ nombre: trimmed }).subscribe({
      next: (updatedUser) => {
        // Update user in localStorage
        localStorage.setItem('usuario', JSON.stringify(updatedUser));
        this.isEditProfileOpen.set(false);
        this.editProfileError.set(null);
      },
      error: (err) => {
        this.editProfileError.set('Error al actualizar el perfil en el servidor.');
        console.error('Profile update error:', err);
      }
    });
  }

  changePassword(old: string, newPass: string, confirm: string): void {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    if (!old || !newPass || !confirm) {
      this.changePasswordError.set('Todos los campos son obligatorios.');
      return;
    }

    if (old !== user.password) {
      this.changePasswordError.set('La contraseña actual es incorrecta.');
      return;
    }

    if (newPass.length < 6) {
      this.changePasswordError.set('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPass !== confirm) {
      this.changePasswordError.set('Las nuevas contraseñas no coinciden.');
      return;
    }

    this.auth.updatePassword(newPass).subscribe({
      next: (updatedUser) => {
        // Update local storage user data
        localStorage.setItem('usuario', JSON.stringify(updatedUser));
        alert('Contraseña actualizada con éxito.');
        this.isChangePasswordOpen.set(false);
        this.changePasswordError.set(null);
      },
      error: (err) => {
        this.changePasswordError.set('Error al actualizar la contraseña en el servidor.');
        console.error('Password change error:', err);
      }
    });
  }

  protected logout(): void {
    this.isProfileMenuOpen.set(false);
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}

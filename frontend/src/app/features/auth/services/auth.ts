import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { map, tap } from 'rxjs/operators';
import { AuthResponse } from '../interfaces/auth.interface';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  isAutenticated = signal(!!localStorage.getItem('token'));
  currentUser = signal<any>(this.getCurrentUser());

  login(email: string, password: string) {
    const credentials = { email, password };
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      map((resp) => {
        localStorage.setItem('token', resp.token);
        localStorage.setItem('usuario', JSON.stringify(resp.usuario));
        this.isAutenticated.set(true);
        this.currentUser.set(resp.usuario);
        return resp;
      })
    );
  }

  register(nombre: string, email: string, password: string, presupuesto: number) {
    const payload = { nombre, email, password, presupuesto };
    return this.http.post<any>(`${this.apiUrl}/auth/register`, payload);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.isAutenticated.set(false);
    this.currentUser.set(null);
  }

  getCurrentUser() {
    const userJson = localStorage.getItem('usuario');
    if (!userJson || userJson === 'undefined') {
      return null;
    }
    try {
      return JSON.parse(userJson);
    } catch (e) {
      console.error('Error parsing user JSON from localStorage:', e);
      return null;
    }
  }

  updatePassword(newPassword: string) {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');
    return this.http.patch<any>(`${this.apiUrl}/usuarios/${user.id}`, { password: newPassword }).pipe(
      tap((updatedUser) => {
        localStorage.setItem('usuario', JSON.stringify(updatedUser));
        this.currentUser.set(updatedUser);
      })
    );
  }

  updateUser(updates: any) {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');
    return this.http.patch<any>(`${this.apiUrl}/usuarios/${user.id}`, updates).pipe(
      tap((updatedUser) => {
        localStorage.setItem('usuario', JSON.stringify(updatedUser));
        this.currentUser.set(updatedUser);
      })
    );
  }
}

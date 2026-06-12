import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { map } from 'rxjs/operators';
import { AuthResponse } from '../interfaces/auth.interface';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';

  isAutenticated = signal(!!localStorage.getItem('token'));

  login(email: string, password: string) {
    const credentials = { email, password };
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      map((resp) => {
        localStorage.setItem('token', resp.token);
        localStorage.setItem('usuario', JSON.stringify(resp.usuario));
        this.isAutenticated.set(true);
        return resp;
      })
    );
  }

  register(nombre: string, email: string, password: string, saldo: number, presupuesto: number, ingresoMensual: number) {
    const payload = { nombre, email, password, saldo, presupuesto, ingresoMensual };
    return this.http.post<any>(`${this.apiUrl}/auth/register`, payload);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.isAutenticated.set(false);
  }

  getCurrentUser() {
    const userJson = localStorage.getItem('usuario');
    return userJson ? JSON.parse(userJson) : null;
  }

  updatePassword(newPassword: string) {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');
    return this.http.patch<any>(`${this.apiUrl}/usuarios/${user.id}`, { password: newPassword });
  }

  updateUser(updates: any) {
    const user = this.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');
    return this.http.patch<any>(`${this.apiUrl}/usuarios/${user.id}`, updates);
  }
}

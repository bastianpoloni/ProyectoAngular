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

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.isAutenticated.set(false);
  }

  getCurrentUser() {
    const userJson = localStorage.getItem('usuario');
    return userJson ? JSON.parse(userJson) : null;
  }
}

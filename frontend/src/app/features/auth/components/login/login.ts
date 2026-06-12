import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);

  errorMessage: string | null = null;
  isLoading = false;
  isRegisterMode = false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  registerForm = this.fb.group({
    nombre: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    saldo: [100000, [Validators.required, Validators.min(0)]],
    presupuesto: [200000, [Validators.required, Validators.min(0)]],
    ingresoMensual: [350000, [Validators.required, Validators.min(0)]]
  });

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.errorMessage = null;
    this.loginForm.reset();
    this.registerForm.patchValue({
      nombre: '',
      email: '',
      password: '',
      saldo: 100000,
      presupuesto: 200000,
      ingresoMensual: 350000
    });
  }

  login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const email = this.loginForm.value.email!;
    const password = this.loginForm.value.password!;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error al iniciar sesión. Inténtalo de nuevo.';
        console.error('Login error:', err);
      }
    });
  }

  register() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const nombre = this.registerForm.value.nombre!;
    const email = this.registerForm.value.email!;
    const password = this.registerForm.value.password!;
    const saldo = Number(this.registerForm.value.saldo) || 0;
    const presupuesto = Number(this.registerForm.value.presupuesto) || 0;
    const ingresoMensual = Number(this.registerForm.value.ingresoMensual) || 0;

    this.authService.register(nombre, email, password, saldo, presupuesto, ingresoMensual).subscribe({
      next: () => {
        // Automatically login after successful registration
        this.authService.login(email, password).subscribe({
          next: () => {
            this.isLoading = false;
            this.router.navigate(['/']);
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = 'Registro exitoso, pero ocurrió un error al iniciar sesión automáticamente.';
            console.error('Auto login error:', err);
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error al registrarse. El correo podría estar en uso.';
        console.error('Registration error:', err);
      }
    });
  }
}

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../../features/auth/services/auth';

export const authGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (authService.isAutenticated()) {
    return true;
  }

  // Redirect to login page
  router.navigate(['/login']);
  return false;
};

export const noAuthGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (!authService.isAutenticated()) {
    return true;
  }

  // Redirect to home page if already authenticated
  router.navigate(['/']);
  return false;
};

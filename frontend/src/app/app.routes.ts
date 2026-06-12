import { Routes } from '@angular/router';

import { CategoriesComponent } from './features/categorias/components/categorias/categorias.component';
import { DashboardComponent } from './features/dashboard/components/dashboard/dashboard.component';
import { DetailComponent } from './features/detalle/components/detalle/detalle.component';
import { HistoryComponent } from './features/historial/components/historial/historial.component';
import { SettingsComponent } from './features/ajustes/components/ajustes/ajustes.component';
import { Login } from './features/auth/components/login/login';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
	{
		path: 'login',
		component: Login,
		title: 'ChanchitoApp | Iniciar Sesión'
	},
	{
		path: '',
		component: DashboardComponent,
		title: 'ChanchitoApp | Resumen',
		canActivate: [authGuard]
	},
	{
		path: 'categorias',
		component: CategoriesComponent,
		title: 'ChanchitoApp | Categorías',
		canActivate: [authGuard]
	},
	{
		path: 'detalle',
		component: DetailComponent,
		title: 'ChanchitoApp | Detalle',
		canActivate: [authGuard]
	},
	{
		path: 'historial',
		component: HistoryComponent,
		title: 'ChanchitoApp | Histórico',
		canActivate: [authGuard]
	},
	{
		path: 'configuracion',
		component: SettingsComponent,
		title: 'ChanchitoApp | Configuración',
		canActivate: [authGuard]
	},
	{
		path: '**',
		redirectTo: ''
	}
];

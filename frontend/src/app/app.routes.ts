import { Routes } from '@angular/router';

import { CategoriesComponent } from './features/categorias/components/categorias/categorias.component';
import { DashboardComponent } from './features/dashboard/components/dashboard/dashboard.component';
import { DetailComponent } from './features/detalle/components/detalle/detalle.component';
import { HistoryComponent } from './features/historial/components/historial/historial.component';
import { SettingsComponent } from './features/ajustes/components/ajustes/ajustes.component';

export const routes: Routes = [
	{
		path: '',
		component: DashboardComponent,
		title: 'ChanchitoApp | Resumen'
	},
	{
		path: 'categorias',
		component: CategoriesComponent,
		title: 'ChanchitoApp | Categorías'
	},
	{
		path: 'detalle',
		component: DetailComponent,
		title: 'ChanchitoApp | Detalle'
	},
	{
		path: 'historial',
		component: HistoryComponent,
		title: 'ChanchitoApp | Histórico'
	},
	{
		path: 'configuracion',
		component: SettingsComponent,
		title: 'ChanchitoApp | Configuración'
	},
	{
		path: '**',
		redirectTo: ''
	}
];

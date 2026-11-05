
import { Routes } from '@angular/router';
import { Inicio } from './components/inicio/inicio';
import { Camara } from './components/camara/camara';
import { Imagen } from './components/imagen/imagen';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: Inicio },
  { path: 'camara', component: Camara },
  { path: 'imagen', component: Imagen },
  { path: '**', redirectTo: 'inicio' }
];

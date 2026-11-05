import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription, timer, switchMap, catchError, of, timeout } from 'rxjs';
import { DeteccionService } from './services/deteccion.service';
@Component({selector:'app-root', standalone:true, imports:[RouterLink,RouterLinkActive,RouterOutlet], templateUrl:'./app.html', styleUrl:'./app.css'})
export class App implements OnInit, OnDestroy {
  estado = 'Comprobando conexión';
  conectado = false;
  private conexion?: Subscription;
  constructor(private api: DeteccionService) {}
  ngOnInit(): void {
    this.conexion = timer(0,15000).pipe(switchMap(() => this.api.comprobarEstado().pipe(timeout(5000),catchError(() => of(null))))).subscribe(res => {
      this.conectado = res?.estado === 'correcto';
      this.estado = this.conectado ? 'Motor de detección conectado' : 'Motor de detección sin conexión';
    });
  }
  ngOnDestroy(): void { this.conexion?.unsubscribe(); }
}

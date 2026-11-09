
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DeteccionService {
  // private apiUrl = 'http://127.0.0.1:5000';
  private apiUrl =
  ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://127.0.0.1:5000'
    : 'https://7rhrqpxn-5000.brs.devtunnels.ms';

  constructor(private http: HttpClient) {}

  detectarImagen(datos: FormData): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/detectar`,
      datos
    );
  }

  detectarCamara(datos: FormData): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/detectar_camara`,
      datos
    );
  }

  guardarDeteccion(datos: { imagen: string }): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/guardar_deteccion`,
      datos
    );
  }

  comprobarEstado(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/estado`);
  }

  urlImagen(ruta: string): string {
    return `${this.apiUrl}${ruta}`;
  }
}

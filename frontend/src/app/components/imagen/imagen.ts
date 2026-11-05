import { Component, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DeteccionService } from '../../services/deteccion.service';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { MessageModule } from 'primeng/message';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { ImageModule } from 'primeng/image';
import { SkeletonModule } from 'primeng/skeleton';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';

interface ObjetoDetectado {
  nombre: string;
  confianza: number;
}

interface ClaseDetectada {
  nombre: string;
  cantidad: number;
}

type Severidad = 'success' | 'warn' | 'danger';

@Component({
  selector: 'app-imagen',
  standalone: true,
  imports: [
    CardModule,
    ButtonModule,
    ProgressBarModule,
    TagModule,
    MessageModule,
    FileUploadModule,
    ImageModule,
    SkeletonModule,
    ChipModule,
    DividerModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './imagen.html',
  styleUrl: './imagen.css'
})
export class Imagen implements OnDestroy {
  archivo?: File;
  urlOriginal = '';
  imagenResultado = '';
  mensajeError = '';
  cargando = false;

  objetos: ObjetoDetectado[] = [];
  total = 0;

  constructor(
    private deteccion: DeteccionService,
    private avisos: MessageService
  ) {}

  /* ---------- Datos derivados para la vista ---------- */

  get tamanoArchivo(): string {
    if (!this.archivo) return '';
    const kb = this.archivo.size / 1024;
    return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  }

  get objetosOrdenados(): ObjetoDetectado[] {
    return [...this.objetos].sort((a, b) => b.confianza - a.confianza);
  }

  get clases(): ClaseDetectada[] {
    const conteo = new Map<string, number>();
    for (const o of this.objetos) {
      conteo.set(o.nombre, (conteo.get(o.nombre) ?? 0) + 1);
    }
    return [...conteo.entries()]
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }

  get confianzaMedia(): number {
    if (this.objetos.length === 0) return 0;
    const suma = this.objetos.reduce((acc, o) => acc + o.confianza, 0);
    return Math.round(suma / this.objetos.length);
  }

  severidad(confianza: number): Severidad {
    if (confianza >= 80) return 'success';
    if (confianza >= 50) return 'warn';
    return 'danger';
  }

  /* ---------- Acciones ---------- */

  seleccionarImagen(evento: { currentFiles?: File[]; files?: File[] }): void {
    const archivo = evento.currentFiles?.[0] ?? evento.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      this.mensajeError = 'Selecciona un archivo de imagen válido.';
      this.reiniciar();
      return;
    }

    this.reiniciar();
    this.mensajeError = '';
    this.archivo = archivo;
    this.urlOriginal = URL.createObjectURL(archivo);
  }

  quitarImagen(cargador: FileUpload): void {
    cargador.clear();
    this.reiniciar();
  }

  detectar(): void {
    if (!this.archivo || this.cargando) {
      this.mensajeError = 'Primero selecciona una imagen.';
      return;
    }

    const datos = new FormData();
    datos.append('imagen', this.archivo);

    this.cargando = true;
    this.mensajeError = '';

    this.deteccion.detectarImagen(datos).subscribe({
      next: (respuesta) => {
        this.imagenResultado = 'data:image/jpeg;base64,' + respuesta.imagen;
        this.objetos = respuesta.objetos ?? [];
        this.total = respuesta.total ?? this.objetos.length;
        this.cargando = false;

        this.avisos.add({
          severity: 'success',
          summary: 'Detección completada',
          detail: respuesta.archivo
            ? 'La imagen se guardó en el servidor.'
            : `Se encontraron ${this.total} objeto(s).`,
          life: 4000
        });
      },
      error: () => {
        this.cargando = false;
        this.mensajeError =
          'No se pudo procesar la imagen. Verifica que el servidor Flask esté activo.';
        this.avisos.add({
          severity: 'error',
          summary: 'Error de conexión',
          detail: 'Revisa que Flask esté en ejecución e inténtalo de nuevo.',
          life: 5000
        });
      }
    });
  }

  /* ---------- Utilidades ---------- */

  private reiniciar(): void {
    this.liberarUrl();
    this.archivo = undefined;
    this.imagenResultado = '';
    this.objetos = [];
    this.total = 0;
  }

  private liberarUrl(): void {
    if (this.urlOriginal) {
      URL.revokeObjectURL(this.urlOriginal);
      this.urlOriginal = '';
    }
  }

  ngOnDestroy(): void {
    this.liberarUrl();
  }
}
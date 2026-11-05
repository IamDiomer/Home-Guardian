import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { ImageModule } from 'primeng/image';
import { ToastModule } from 'primeng/toast';

import { DeteccionService } from '../../services/deteccion.service';

interface ObjetoDetectado {
  nombre: string;
  confianza: number;
}

interface ClaseDetectada {
  nombre: string;
  cantidad: number;
}

/** Datos que se muestran bajo cada imagen: métricas, clases y lista. */
interface Resumen {
  total: number;
  objetos: ObjetoDetectado[]; // ordenados por confianza
  clases: ClaseDetectada[];
  confianzaMedia: number;
}

interface ImagenGuardada {
  archivo: string;
  url: string;
  fecha: string;
  resumen: Resumen;
}

interface OpcionCamara {
  label: string;
  value: string;
}

type TipoMensaje = 'exito' | 'error' | 'info';
type Severidad = 'success' | 'warn' | 'danger';

const CLAVE_HISTORIAL = 'detecciones-guardadas';
const MAXIMO_HISTORIAL = 30;

@Component({
  selector: 'app-camara',
  standalone: true,
  imports: [
    DecimalPipe,
    NgTemplateOutlet,
    FormsModule,
    CardModule,
    ButtonModule,
    TagModule,
    ChipModule,
    DividerModule,
    ProgressBarModule,
    SelectModule,
    ImageModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './camara.html',
  styleUrl: './camara.css'
})
export class Camara implements OnInit, OnDestroy {
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  activo = false;
  iniciando = false;
  procesando = false;
  guardando = false;

  imagenResultado = '';
  resumen: Resumen = this.resumir([]);

  opcionesCamara: OpcionCamara[] = [];
  camaraSeleccionada: string | null = null;

  imagenesGuardadas: ImagenGuardada[] = [];

  private flujo?: MediaStream;
  private intervalo?: number;
  private ultimoErrorFotograma = 0;

  // Actualiza la lista si se conecta o desconecta una cámara.
  private readonly alCambiarDispositivos = () => {
    void this.cargarCamaras();
  };

  constructor(
    private deteccion: DeteccionService,
    private avisos: MessageService
  ) {}

  severidad(confianza: number): Severidad {
    if (confianza >= 80) return 'success';
    if (confianza >= 50) return 'warn';
    return 'danger';
  }

  /* ---------- Ciclo de vida ---------- */

  ngOnInit(): void {
    this.imagenesGuardadas = this.leerHistorial();
    void this.cargarCamaras();
    navigator.mediaDevices?.addEventListener?.(
      'devicechange',
      this.alCambiarDispositivos
    );
  }

  ngOnDestroy(): void {
    navigator.mediaDevices?.removeEventListener?.(
      'devicechange',
      this.alCambiarDispositivos
    );
    this.detenerCamara();
  }

  /* ---------- Cámaras ---------- */

  private async cargarCamaras(): Promise<void> {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    try {
      const dispositivos = await navigator.mediaDevices.enumerateDevices();

      // Antes de conceder el permiso el navegador puede ocultar los ids.
      this.opcionesCamara = dispositivos
        .filter((d) => d.kind === 'videoinput' && d.deviceId)
        .map((d, i) => ({
          label: d.label || `Cámara ${i + 1}`,
          value: d.deviceId
        }));

      const existe = this.opcionesCamara.some(
        (o) => o.value === this.camaraSeleccionada
      );
      if (this.camaraSeleccionada && !existe) {
        this.camaraSeleccionada = null;
      }
    } catch {
      this.opcionesCamara = [];
    }
  }

  async cambiarCamara(): Promise<void> {
    // Si la cámara está apagada, solo se guarda la elección.
    if (!this.activo) return;

    this.detenerCamara();
    await this.iniciarCamara();
  }

  async iniciarCamara(): Promise<void> {
    if (this.activo || this.iniciando) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      this.mostrarMensaje(
        'El navegador no permite acceder a la cámara en esta dirección. Usa HTTPS o localhost.',
        'error'
      );
      return;
    }

    this.iniciando = true;

    try {
      this.flujo = await navigator.mediaDevices.getUserMedia({
        video: this.camaraSeleccionada
          ? { deviceId: { exact: this.camaraSeleccionada } }
          : true,
        audio: false
      });

      const elementoVideo = this.video.nativeElement;
      elementoVideo.srcObject = this.flujo;
      await elementoVideo.play();

      this.activo = true;

      // Con el permiso concedido ya se conocen los nombres de las cámaras.
      const idActual = this.flujo.getVideoTracks()[0]?.getSettings().deviceId;
      await this.cargarCamaras();
      if (!this.camaraSeleccionada && idActual) {
        this.camaraSeleccionada = idActual;
      }

      // Enviar fotogramas para detectar objetos.
      this.intervalo = window.setInterval(() => {
        this.enviarFotograma();
      }, 700);
    } catch (error) {
      this.detenerCamara();

      const nombre = error instanceof DOMException ? error.name : '';
      let detalle = 'No se pudo iniciar la cámara.';

      if (nombre === 'NotAllowedError') {
        detalle = 'Permiso de cámara denegado. Actívalo en el navegador e inténtalo de nuevo.';
      } else if (nombre === 'NotReadableError') {
        detalle = 'La cámara está siendo usada por otra aplicación.';
      } else if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') {
        detalle = 'La cámara seleccionada no está disponible.';
        this.camaraSeleccionada = null;
        await this.cargarCamaras();
      }

      this.mostrarMensaje(detalle, 'error');
    } finally {
      this.iniciando = false;
    }
  }

  detenerCamara(): void {
    this.activo = false;

    if (this.intervalo !== undefined) {
      window.clearInterval(this.intervalo);
      this.intervalo = undefined;
    }

    if (this.flujo) {
      this.flujo.getTracks().forEach((pista) => pista.stop());
      this.flujo = undefined;
    }

    if (this.video?.nativeElement) {
      this.video.nativeElement.srcObject = null;
    }

    this.procesando = false;
  }

  /* ---------- Detección ---------- */

  private enviarFotograma(): void {
    if (!this.activo || this.procesando) return;

    const video = this.video.nativeElement;
    const canvas = this.canvas.nativeElement;

    if (!video.videoWidth || !video.videoHeight) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const contexto = canvas.getContext('2d');
    if (!contexto) return;

    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.procesando = true;

    canvas.toBlob((blob) => {
      if (!blob || !this.activo) {
        this.procesando = false;
        return;
      }

      const datos = new FormData();
      datos.append('imagen', blob, 'fotograma.jpg');

      this.deteccion.detectarCamara(datos).subscribe({
        next: (respuesta) => {
          this.procesando = false;
          // Ignora respuestas que llegan después de detener o cambiar de cámara.
          if (!this.activo) return;

          this.imagenResultado = 'data:image/jpeg;base64,' + respuesta.imagen;
          this.resumen = this.resumir(
            this.normalizar(respuesta.objetos),
            respuesta.total
          );
        },
        error: () => {
          this.procesando = false;

          // Evita llenar la pantalla de avisos si Flask está caído.
          const ahora = Date.now();
          if (ahora - this.ultimoErrorFotograma > 10000) {
            this.ultimoErrorFotograma = ahora;
            this.mostrarMensaje(
              'No se pudo procesar el fotograma. Comprueba que Flask esté ejecutándose.',
              'error'
            );
          }
        }
      });
    }, 'image/jpeg', 0.9);
  }

  /* ---------- Guardado ---------- */

  guardarDeteccion(): void {
    if (!this.imagenResultado) {
      this.mostrarMensaje(
        'Espera a que la cámara detecte y muestre una imagen.',
        'info'
      );
      return;
    }

    if (this.guardando) return;

    // Se toma una copia ahora: el fotograma sigue cambiando mientras se guarda.
    const instantanea = this.resumen;
    const carga = {
      imagen: this.imagenResultado,
      objetos: instantanea.objetos,
      total: instantanea.total
    };

    this.guardando = true;

    this.deteccion.guardarDeteccion(carga).subscribe({
      next: (respuesta) => {
        const guardada: ImagenGuardada = {
          archivo: respuesta.archivo,
          url: this.deteccion.urlImagen(respuesta.url),
          fecha: new Date().toLocaleString(),
          resumen: instantanea
        };

        this.imagenesGuardadas = [guardada, ...this.imagenesGuardadas].slice(
          0,
          MAXIMO_HISTORIAL
        );
        this.escribirHistorial();

        this.mostrarMensaje(
          `Imagen guardada correctamente: ${respuesta.archivo}`,
          'exito'
        );
        this.guardando = false;
      },
      error: (error) => {
        const mensaje =
          error?.error?.error ??
          'No se pudo guardar la imagen. Comprueba que Flask esté funcionando.';

        this.mostrarMensaje(mensaje, 'error');
        this.guardando = false;
      }
    });
  }

  vaciarHistorial(): void {
    this.imagenesGuardadas = [];
    this.escribirHistorial();
  }

  /* ---------- Historial persistente ---------- */

  private leerHistorial(): ImagenGuardada[] {
    try {
      const texto = localStorage.getItem(CLAVE_HISTORIAL);
      const lista = texto ? JSON.parse(texto) : [];
      if (!Array.isArray(lista)) return [];

      return lista
        .filter((x) => x && typeof x.archivo === 'string' && typeof x.url === 'string')
        .map((x) => ({
          archivo: x.archivo,
          url: x.url,
          fecha: String(x.fecha ?? ''),
          resumen: this.resumir(
            this.normalizar(x.resumen?.objetos),
            x.resumen?.total
          )
        }));
    } catch {
      return [];
    }
  }

  private escribirHistorial(): void {
    try {
      localStorage.setItem(
        CLAVE_HISTORIAL,
        JSON.stringify(this.imagenesGuardadas)
      );
    } catch {
      // Sin almacenamiento disponible: el historial dura solo la sesión.
    }
  }

  /* ---------- Utilidades ---------- */

  private normalizar(lista: any[] | undefined): ObjetoDetectado[] {
    if (!Array.isArray(lista)) return [];

    return lista.map((objeto) => ({
      nombre: String(objeto.nombre ?? 'Desconocido'),
      confianza: Math.min(100, Math.max(0, Number(objeto.confianza ?? 0)))
    }));
  }

  private resumir(objetos: ObjetoDetectado[], total?: number): Resumen {
    const ordenados = [...objetos].sort((a, b) => b.confianza - a.confianza);

    const conteo = new Map<string, number>();
    for (const o of ordenados) {
      conteo.set(o.nombre, (conteo.get(o.nombre) ?? 0) + 1);
    }

    const clases = [...conteo.entries()]
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const confianzaMedia = ordenados.length
      ? Math.round(
          ordenados.reduce((suma, o) => suma + o.confianza, 0) / ordenados.length
        )
      : 0;

    return {
      total: total ?? ordenados.length,
      objetos: ordenados,
      clases,
      confianzaMedia
    };
  }

  private mostrarMensaje(mensaje: string, tipo: TipoMensaje): void {
    const severidad = { exito: 'success', error: 'error', info: 'info' } as const;
    const titulo = {
      exito: 'Listo',
      error: 'Ha ocurrido un problema',
      info: 'Información'
    } as const;

    this.avisos.add({
      severity: severidad[tipo],
      summary: titulo[tipo],
      detail: mensaje,
      life: tipo === 'error' ? 6000 : 4000
    });
  }
}
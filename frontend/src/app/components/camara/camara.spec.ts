import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Camara } from './camara';
describe('Camera comparison workspace', () => {
 let fixture: ComponentFixture<Camara>; let component: Camara;
 beforeEach(async () => {
  await TestBed.configureTestingModule({imports:[Camara],providers:[provideHttpClient(),provideHttpClientTesting(),provideNoopAnimations()]}).compileComponents();
  fixture=TestBed.createComponent(Camara);component=fixture.componentInstance;fixture.detectChanges();
 });
 it('keeps the preview video mounted before camera permissions are requested', () => {
  const video: HTMLVideoElement=fixture.nativeElement.querySelector('video');
  expect(video).toBeTruthy();expect(video.hidden).toBeFalse();expect(video.muted).toBeTrue();expect(video.hasAttribute('playsinline')).toBeTrue();
  expect(fixture.nativeElement.querySelector('.preview-vacia').textContent).toContain('Tu cámara aparecerá aquí');
 });
 it('shows the live preview independently of the inference response', () => {
  component.activo=true;fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('video').classList.contains('video-visible')).toBeTrue();
  expect(fixture.nativeElement.querySelector('.pantalla-preview .preview-vacia')).toBeNull();
  expect(fixture.nativeElement.querySelector('.pantalla-resultado').textContent).toContain('Analizando fotogramas');
 });
 it('retains an annotated result beside the preview when the camera is stopped', () => {
  component.imagenResultado='data:image/jpeg;base64,AA==';fixture.detectChanges();
  expect(fixture.nativeElement.querySelector('.pantalla-resultado img')).toBeTruthy();
  expect(fixture.nativeElement.querySelector('.tarjeta-deteccion').textContent).toContain('Último resultado conservado');
  expect(fixture.nativeElement.querySelector('.pantalla-preview').contains(fixture.nativeElement.querySelector('.pantalla-resultado img'))).toBeFalse();
 });
});

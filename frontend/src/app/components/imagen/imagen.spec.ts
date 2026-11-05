import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { DeteccionService } from '../../services/deteccion.service';
import { Imagen } from './imagen';
describe('Image comparison workspace', () => {
 let fixture: ComponentFixture<Imagen>;let component: Imagen;let api: jasmine.SpyObj<DeteccionService>;
 beforeEach(async () => {
  api=jasmine.createSpyObj('DeteccionService',['detectarImagen']);
  await TestBed.configureTestingModule({imports:[Imagen],providers:[provideHttpClient(),provideHttpClientTesting(),{provide:DeteccionService,useValue:api},provideNoopAnimations()]}).compileComponents();
  fixture=TestBed.createComponent(Imagen);component=fixture.componentInstance;fixture.detectChanges();
 });
 it('disables analysis until an image is selected', () => {
  expect(fixture.nativeElement.querySelector('.boton-detectar button').disabled).toBeTrue();
 });
 it('keeps the original visible while rendering the annotated result', () => {
  const file=new File(['<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'],'interior.svg',{type:'image/svg+xml'});
  component.seleccionarImagen({files:[file]});fixture.detectChanges();
  const original=component.urlOriginal;expect(fixture.nativeElement.querySelector('.original-grande img')).toBeTruthy();
  api.detectarImagen.and.returnValue(of({imagen:'AA==',objetos:[{nombre:'smoke',confianza:91}],total:1,archivo:'resultado.jpg'}));
  component.detectar();fixture.detectChanges();
  expect(api.detectarImagen).toHaveBeenCalled();expect(component.urlOriginal).toBe(original);
  expect(fixture.nativeElement.querySelector('.original-grande img').getAttribute('src')).toBe(original);
  expect(fixture.nativeElement.querySelector('.contenedor-imagen img')).toBeTruthy();
  expect(fixture.nativeElement.querySelector('.columna-resultados').textContent).toContain('smoke');
  const data=api.detectarImagen.calls.mostRecent().args[0];expect(data.get('imagen')).toBe(file);
 });
});

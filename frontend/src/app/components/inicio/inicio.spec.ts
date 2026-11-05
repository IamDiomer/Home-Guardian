import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Inicio } from './inicio';

describe('Inicio', () => {
  let component: Inicio;
  let fixture: ComponentFixture<Inicio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Inicio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should offer the camera and image detection modes', () => {
    const links = fixture.nativeElement.querySelectorAll('a[routerLink]');
    expect(links.length).toBe(3);
    expect(Array.from(links, (link: Element) => link.getAttribute('routerLink'))).toEqual([
      '/camara',
      '/camara',
      '/imagen'
    ]);
  });
});

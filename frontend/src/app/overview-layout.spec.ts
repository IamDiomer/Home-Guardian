import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { routes } from './app.routes';
import { DeteccionService } from './services/deteccion.service';
describe('Overview desktop layout', () => {
 for (const [width,height] of [[1366,768],[1280,720],[1920,1080]]) {
  it(`fits ${width}x${height} without a scrollbar or clipped content`, async () => {
   await TestBed.configureTestingModule({imports:[App],providers:[provideRouter(routes),{provide:DeteccionService,useValue:{comprobarEstado:()=>of({estado:'correcto'})}}]}).compileComponents();
   spyOn(App.prototype,'ngOnInit').and.stub();
   const fixture=TestBed.createComponent(App);fixture.detectChanges();
   await TestBed.inject(Router).navigateByUrl('/inicio');fixture.detectChanges();
   const css=Array.from(document.styleSheets).map(sheet=>{try{return Array.from(sheet.cssRules).map(rule=>rule.cssText).join('\n');}catch{return '';}}).join('\n');
   const frame=document.createElement('iframe');frame.style.cssText=`position:absolute;left:-20000px;top:0;width:${width}px;height:${height}px;border:0`;
   document.body.appendChild(frame);
   try {
    const doc=frame.contentDocument!;doc.open();doc.write('<!doctype html><html><head><style>'+css+'</style></head><body>'+fixture.nativeElement.outerHTML+'</body></html>');doc.close();
    await new Promise(resolve=>setTimeout(resolve,100));
    const root=doc.documentElement;
    expect(root.scrollHeight).withContext('Vertical content must fit '+width+'x'+height+'; hero='+doc.querySelector('.hero')!.getBoundingClientRect().height+'; main='+doc.querySelector('main')!.getBoundingClientRect().height).toBeLessThanOrEqual(height+1);
    expect(root.scrollWidth).withContext('Horizontal content must fit').toBeLessThanOrEqual(width+1);
    expect(doc.querySelectorAll('a[routerlink]').length).toBeGreaterThanOrEqual(3);
    const footer=doc.querySelector('.pie')!.getBoundingClientRect();expect(footer.bottom).toBeLessThanOrEqual(height+1);
    expect(frame.contentWindow!.getComputedStyle(root).overflowY).not.toBe('hidden');
   } finally {frame.remove();fixture.destroy();}
  });
 }
});

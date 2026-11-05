import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { DeteccionService } from './deteccion.service';

describe('DeteccionService', () => {
  let service: DeteccionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(DeteccionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { TestBed } from '@angular/core/testing';

import { ThemingsService } from './themings.service';

describe('ThemingsService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ThemingsService = TestBed.get(ThemingsService);
    expect(service).toBeTruthy();
  });
});

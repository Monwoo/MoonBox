import { TestBed } from '@angular/core/testing';

import { SecuStorageService } from './secu-storage.service';

describe('SecuStorageService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: SecuStorageService = TestBed.get(SecuStorageService);
    expect(service).toBeTruthy();
  });
});

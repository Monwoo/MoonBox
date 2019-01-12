import { TestBed } from '@angular/core/testing';

import { BackendCanActivateService } from './backend-can-activate.service';

describe('BackendCanActivateService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: BackendCanActivateService = TestBed.get(BackendCanActivateService);
    expect(service).toBeTruthy();
  });
});

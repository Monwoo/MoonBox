import { TestBed } from '@angular/core/testing';

import { LoadingLoaderService } from './loading-loader.service';

describe('LoadingLoaderService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: LoadingLoaderService = TestBed.get(LoadingLoaderService);
    expect(service).toBeTruthy();
  });
});

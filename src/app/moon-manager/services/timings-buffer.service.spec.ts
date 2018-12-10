import { TestBed } from '@angular/core/testing';

import { TimingsBufferService } from './timings-buffer.service';

describe('TimingsBufferService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TimingsBufferService = TestBed.get(TimingsBufferService);
    expect(service).toBeTruthy();
  });
});

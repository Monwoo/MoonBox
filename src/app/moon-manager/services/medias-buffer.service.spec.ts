import { TestBed } from '@angular/core/testing';

import { MediasBufferService } from './medias-buffer.service';

describe('MediasBufferService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MediasBufferService = TestBed.get(MediasBufferService);
    expect(service).toBeTruthy();
  });
});

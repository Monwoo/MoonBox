import { TestBed } from '@angular/core/testing';

import { RoutingSentinelService } from './routing-sentinel.service';

describe('RoutingSentinelService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: RoutingSentinelService = TestBed.get(RoutingSentinelService);
    expect(service).toBeTruthy();
  });
});

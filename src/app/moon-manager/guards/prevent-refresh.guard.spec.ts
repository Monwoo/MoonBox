import { TestBed, async, inject } from '@angular/core/testing';

import { PreventRefreshGuard } from './prevent-refresh.guard';

describe('PreventRefreshGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PreventRefreshGuard]
    });
  });

  it('should ...', inject([PreventRefreshGuard], (guard: PreventRefreshGuard) => {
    expect(guard).toBeTruthy();
  }));
});

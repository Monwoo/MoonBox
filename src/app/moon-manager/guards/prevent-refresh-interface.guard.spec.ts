import { TestBed, async, inject } from '@angular/core/testing';

import { PreventRefreshInterfaceGuard } from './prevent-refresh-interface.guard';

describe('PreventRefreshInterfaceGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PreventRefreshInterfaceGuard]
    });
  });

  it('should ...', inject([PreventRefreshInterfaceGuard], (guard: PreventRefreshInterfaceGuard) => {
    expect(guard).toBeTruthy();
  }));
});

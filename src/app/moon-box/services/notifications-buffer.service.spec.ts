// Copyright Monwoo 2019, made by Miguel Monwoo, service@monwoo.com
import { TestBed } from '@angular/core/testing';

import { NotificationsBufferService } from './notifications-buffer.service';

describe('NotificationsBufferService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: NotificationsBufferService = TestBed.get(NotificationsBufferService);
    expect(service).toBeTruthy();
  });
});

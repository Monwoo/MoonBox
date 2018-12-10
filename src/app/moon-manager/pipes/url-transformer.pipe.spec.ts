// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com
import { TestBed, async, inject } from '@angular/core/testing';

import { UrlTransformerPipe } from './url-transformer.pipe';
import { MediasBufferService } from '../services/medias-buffer.service';

// TODO : check if test pass, having lint issues for now...
describe('UrlTransformerPipe', () => {
  // https://stackoverflow.com/questions/43520257/angular2-service-testing-inject-a-dependency-with-beforeeach
  let service: MediasBufferService;
  beforeEach(inject([MediasBufferService], (svc: MediasBufferService) => {
    service = svc;
  }));

  it('create an instance', () => {
    const pipe = new UrlTransformerPipe(service);
    expect(pipe).toBeTruthy();
  });
});

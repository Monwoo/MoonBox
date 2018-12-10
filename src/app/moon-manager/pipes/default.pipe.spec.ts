// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { DefaultPipe } from './default.pipe';

describe('DefaultPipe', () => {
  it('create an instance', () => {
    const pipe = new DefaultPipe();
    expect(pipe).toBeTruthy();
  });
});

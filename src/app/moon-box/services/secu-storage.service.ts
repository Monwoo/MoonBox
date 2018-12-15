// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable } from '@angular/core';
import { forkJoin, of, interval } from 'rxjs';
// https://github.com/softvar/secure-ls
declare const require: any; // To avoid typeScript error about require that don't exist since it's webpack level
const SecureLS = require('secure-ls');

@Injectable({
  providedIn: 'root'
})
export class SecuStorageService {
  private storage: any;
  constructor() {
    this.storage = new SecureLS({ encodingType: 'aes' });
  }
  public getItem<T>(key: string, failback: any = null) {
    const i = this.storage.get(key);
    return of<T>(null === i ? failback : i);
  }
  public setItem<T>(key: string, value: any) {
    return of<T>(this.storage.set(key, value));
  }
  public removeItem<T>(key: string) {
    return of<T>(this.storage.remove(key));
  }
}

// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { forkJoin, of, interval } from 'rxjs';
// https://github.com/softvar/secure-ls
declare const require: any; // To avoid typeScript error about require that don't exist since it's webpack level
const SecureLS = require('secure-ls');

@Injectable({
  providedIn: 'root'
})
export class SecuStorageService {
  private storage: any;
  public passCode: string = ''; // TODO : param guard for pass code to block UI, and if bad guessed, can only wipeout prevous logged user datas...
  public lockDownTimeInMs: number = 5 * 60 * 1000; // 5 minutes en millisecondes

  constructor() {
    // TODO : may have a mode without encryptionSecret: environment.clientSecret + this.passCode ?
    // what if update application in prod => will wipe out all conneted user datas...
    // well : add warning msg about BACKUP their data, since may diseapear on Demo Version upgrades
    // this.storage = new SecureLS({ encodingType: 'aes', encryptionSecret: environment.clientSecret + this.passCode });
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

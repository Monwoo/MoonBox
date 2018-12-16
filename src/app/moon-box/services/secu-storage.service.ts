// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable, ViewContainerRef } from '@angular/core';
import { environment } from '@env/environment';
import { forkJoin, of, interval } from 'rxjs';
import { Md5 } from 'ts-md5/dist/md5';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { MatDialog, MatDialogRef } from '@angular/material';
import { LockScreenComponent } from '@moon-box/components/lock-screen/lock-screen.component';

// https://github.com/softvar/secure-ls
declare const require: any; // To avoid typeScript error about require that don't exist since it's webpack level
const SecureLS = require('secure-ls');

@Injectable({
  providedIn: 'root'
})
export class SecuStorageService {
  private storage: any;
  private secuStorage: any = null;
  private passCode: string = ''; // TODO : param guard for pass code to block UI, and if bad guessed, can only wipeout prevous logged user datas...
  public lockDownTimeInMs: number = 5 * 60 * 1000; // 5 minutes en millisecondes
  private lastLockCheckTime: Date;
  public lockTargetContainer: ViewContainerRef = null;
  private lockDialogRef: MatDialogRef<LockScreenComponent> = null;

  constructor(private localStorage: LocalStorage, private dialog: MatDialog) {
    // TODO : may have a mode without encryptionSecret: environment.clientSecret + this.passCode ?
    // what if update application in prod => will wipe out all conneted user datas...
    // well : add warning msg about BACKUP their data, since may diseapear on Demo Version upgrades
    this.storage = new SecureLS({ encodingType: 'aes' });
    let eS = this.storage.get('eS');
    if (!!eS && '' !== eS) {
      this.secuStorage = new SecureLS({ encodingType: 'aes', encryptionSecret: eS });
    } else {
      this.secuStorage = this.storage;
    }
    this.checkLockScreen();
  }

  public setLockContainer(lockContainer: ViewContainerRef) {
    // TODO : do not seem to map lockModal to boxes component => hacked via SCSS for now...
    this.lockTargetContainer = lockContainer;
    this.checkLockScreen();
  }

  public dismissLockScreen() {
    if (this.lockDialogRef) {
      this.lockDialogRef.close();
    }
  }

  public checkLockScreen() {
    if (this.lockDialogRef) {
      // this.lockDialogRef.close();
      return; // Lock screen is already displayed, avoid touchy side effect of quick dev algo...
    }
    // TODO : if lastLockCheckTime + lockDownTime > now => ask password again
    // + monitor activity => one activity should postpone the lock...
    let pC = this.storage.get('pC');
    // https://material.angular.io/components/dialog/api
    this.lockDialogRef = this.dialog.open(LockScreenComponent, {
      width: '250px',
      data: { passHash: pC },
      backdropClass: 'lock-backdrop',
      panelClass: 'lock-overlay',
      autoFocus: true,
      disableClose: true
      // viewContainerRef: this.lockTargetContainer,
    });

    this.lockDialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.lockDialogRef = null;
      // this.lockReport = result;
    });
  }

  public openDataKey = ['access_token', 'language'];
  public lvl1SecuDataKey = ['pC', 'cS', 'eS'];
  openData = {}; // TODO : refactor : not used, preventing algo based on openDataKey instead...
  protected saveOpenData() {
    return forkJoin(
      this.openDataKey.map(k => {
        async function responder() {
          this.openData[k] = await this.localStorage.getItem(k).toPromise();
        }
        return responder();
      })
    );
  }

  protected restoreOpenData() {
    return forkJoin(
      this.openDataKey.map(k => {
        async function responder() {
          await this.localStorage.setItem(k, this.openData[k]).toPromise();
        }
        return responder();
      })
    );
  }

  // Add a pass code feature to secu storage.
  public setPassCode(rawCode: string) {
    const code = rawCode && '' !== rawCode ? Md5.hashStr(rawCode) : null;
    const lastPc = this.storage.get('pC', code);
    let lastCs = this.storage.get('cS', code);
    if (!lastCs) lastCs = environment.clientSecret;
    this.storage.set('pC', code);
    this.storage.set('cS', lastCs);
    if (lastPc !== code) {
      let secuData = {};
      if (this.secuStorage) {
        this.secuStorage.getAllKeys().forEach((k: string) => {
          if (!this.openDataKey.includes(k) && !this.lvl1SecuDataKey.includes(k)) {
            secuData[k] = this.secuStorage.get(k);
          }
        });
        this.secuStorage.removeAll();
        this.secuStorage = null;
      }
      let eS = null;
      if (code && '' !== code) {
        eS = lastCs + code;
        this.secuStorage = new SecureLS({ encodingType: 'aes', encryptionSecret: eS });
        Object.keys(secuData).forEach((k: string) => {
          this.secuStorage.set(k, secuData[k]);
        });
      } else {
        this.secuStorage = this.storage;
      }
      this.storage.set('eS', eS);
    }

    return of(true);
  }
  public getItem<T>(key: string, failback: any = null) {
    const i = this.secuStorage.get(key);
    return of<T>(null === i ? failback : i);
  }
  public setItem<T>(key: string, value: any) {
    return of<T>(this.secuStorage.set(key, value));
  }
  public removeItem<T>(key: string) {
    return of<T>(this.secuStorage.remove(key));
  }
}

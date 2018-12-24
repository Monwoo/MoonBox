// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable, ViewContainerRef, NgZone } from '@angular/core';
import { environment } from '@env/environment';
import { forkJoin, of, interval } from 'rxjs';
import { Md5 } from 'ts-md5/dist/md5';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { MatDialog, MatDialogRef } from '@angular/material';
import { LockScreenComponent } from '@moon-box/components/lock-screen/lock-screen.component';
import { I18nService } from '@app/core';
import { extract } from '@app/core';
import { NotificationsService } from 'angular2-notifications';
import { CookieService } from 'ngx-cookie-service';
import { BackendService } from '@moon-box/services/backend.service';

import { Logger } from '@app/core/logger.service';
const logReview = new Logger('MonwooReview');

// https://github.com/softvar/secure-ls
declare const require: any; // To avoid typeScript error about require that don't exist since it's webpack level
const SecureLS = require('secure-ls');

@Injectable({
  providedIn: 'root'
})
export class SecuStorageService {
  private storage: any = null;
  public lockDownTimeInMs: number = 5 * 1000; // 5 minutes en millisecondes
  private lastLockCheckDate: Date = null;
  public lockTargetContainer: ViewContainerRef = null;
  public isLocked: boolean = false;
  private lockDialogRef: MatDialogRef<LockScreenComponent> = null;
  private rawCode: string = '';
  private lastRawCode: string = '';

  private eS: string = null;
  private lastEs: string = null;
  private pC: string = null;
  private cS: string = null;
  private debugStorage = false;
  constructor(
    private backend: BackendService,
    private dialog: MatDialog,
    private ngZone: NgZone,
    private i18nService: I18nService,
    private notif: NotificationsService,
    private cookieService: CookieService,
    private localStorage: LocalStorage
  ) {
    this.checkLock();
  }

  public checkLock() {
    try {
      // TODO : may have a mode without encryptionSecret: environment.clientSecret + this.passCode ?
      // what if update application in prod => will wipe out all conneted user datas...
      // well : add warning msg about BACKUP their data, since may diseapear on Demo Version upgrades
      this.setupStorage('lvl1');
      try {
        this.eS = this.storage.get('eS');
        this.pC = this.storage.get('pC');
        this.cS = this.storage.get('cS');
      } catch (error) {
        logReview.warn(error);
      }
      this.setupStorage('lvl2');
      this.checkLockScreen();
    } catch (error) {
      logReview.error(error);
      this.storage.isLocked = true;
    }
  }

  protected setupStorage(secuLvl: 'lvl1' | 'lvl2' | 'lastEs') {
    try {
      if (this.debugStorage) {
        this.storage = new SecureLS({ encodingType: '', isCompression: false });
        return;
      }
      switch (secuLvl) {
        case 'lvl1':
          {
            this.storage = new SecureLS({ encodingType: 'aes' });
          }
          break;
        case 'lvl2':
          {
            if (!!this.eS && '' !== this.eS) {
              this.storage = new SecureLS({ encodingType: 'aes', encryptionSecret: this.eS + this.rawCode });
            } else {
              this.storage = new SecureLS({ encodingType: 'aes' });
            }
          }
          break;
        case 'lastEs':
          {
            if (!!this.lastEs && '' !== this.lastEs) {
              this.storage = new SecureLS({ encodingType: 'aes', encryptionSecret: this.lastEs + this.lastRawCode });
            } else {
              this.storage = new SecureLS({ encodingType: 'aes' });
            }
          }
          break;
        default:
          break;
      }
    } catch (error) {
      // Falback to auto-restore viable context for app to still run and let
      // user to access parameters => reset btn...
      // this.storage = {
      //   set:(k:string, v:any)=>{},
      //   get:(k:string)=><any>null,
      //   remove:(k:string)=>{},
      //   getAllKeys:()=><string[]>[],
      // };
      // (async () => {
      //   localStorage.clear(); // Native one may work, next call may fail since encrypted data ?
      //   this.localStorage.clear().subscribe(() => {
      //     this.i18nService.get(extract('mb.param.notif.didCleanStorageDueErr')).subscribe(t => {
      //       this.notif.error(t);
      //     });
      //   });
      // })();
      this.storage.isLocked = true;
      logReview.error(error);
      // this.storage.isLocked = true;
    }
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

  preventDialogRef: MatDialogRef<LockScreenComponent> = null;

  public ensureLockIsNotClosable() {
    if (this.lockDialogRef) {
      this.lockDialogRef.disableClose = true;
    }
  }

  public dismissLockScreenForPreventScreen() {
    if (this.lockDialogRef) {
      this.lockDialogRef.disableClose = false;
    }
    // if (this.preventDialogRef && this.preventDialogRef === this.lockDialogRef) {
    //   return; // Nothing to do, preventDialogRef is already shown...
    // }

    // if (this.lockDialogRef) {
    //   this.lockDialogRef.afterClosed().subscribe(unlockOk => {
    //     this.lockDialogRef = null
    //     this.showLockScreen(false);
    //   });
    //   this.lockDialogRef.close();
    // } else {
    //   this.showLockScreen(false);
    // }
  }

  public resetLockTimer() {
    this.lastLockCheckDate = new Date();
    this.ngZone.run(() => {
      this.isLocked = false;
    });
  }

  public showLockScreen(disableClose: boolean = true) {
    if (this.lockDialogRef) {
      // this.lockDialogRef.close();
      return; // Lock screen is already displayed, avoid touchy side effect of quick dev algo...
    }

    // regular log out (may fail if network issue) :
    this.backend.logout();
    // System D logout in case network fails :
    // Clear session connection with the backend on frontend side :
    this.cookieService.delete('PHPSESSID');
    this.removeItem('access_token');
    // Clear session connection with the backend on backend front Api side :
    // Inspired from :
    // https://stackoverflow.com/questions/2144386/how-to-delete-a-cookie/2138471#2138471
    let expDate = new Date();
    expDate.setTime(0);
    let cookie = 'PHPSESSID=;';
    if (environment.moonBoxBackendDomain) {
      cookie += ' domain=' + environment.moonBoxBackendDomain + ';';
    }
    if (environment.moonBoxBackendBasePath) {
      cookie += ' path=' + environment.moonBoxBackendBasePath + ';';
    }
    cookie += ' expires=' + expDate.toUTCString() + '; Max-Age=-99999999;';
    logReview.debug('Removing Cookie with : ', cookie);
    document.cookie = cookie;

    this.isLocked = true;

    this.lastLockCheckDate = null;
    // https://material.angular.io/components/dialog/api
    this.lockDialogRef = this.dialog.open(LockScreenComponent, {
      width: '250px',
      data: { passHash: this.pC },
      backdropClass: disableClose ? 'lock-backdrop' : '',
      panelClass: 'lock-overlay',
      autoFocus: true,
      disableClose: disableClose
      // viewContainerRef: this.lockTargetContainer,
    });
    this.lockDialogRef.afterClosed().subscribe(unlockOk => {
      console.log('The dialog was closed');
      this.lockDialogRef = null;
      // this.preventDialogRef = null;
      if (unlockOk) {
        this.resetLockTimer();
      }
      // this.lockReport = result;
    });
    // if (!disableClose) {
    //   this.preventDialogRef = this.lockDialogRef;
    // }
  }

  public checkLockScreen() {
    this.isLocked = false;
    if (!this.pC || this.pC === '') {
      return; // No need of lock screen since no PassCode defined
    }
    const currentDate = new Date();
    if (!this.lastLockCheckDate || currentDate.getTime() - this.lastLockCheckDate.getTime() > this.lockDownTimeInMs) {
      this.isLocked = true;
      this.showLockScreen();
    }
  }

  public openDataKey = ['language'];
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

  public async clear() {
    await this.localStorage.clear().toPromise();
    this.pC = null;
    this.eS = null;
    this.cS = null;
    this.lastEs = null;
    this.rawCode = null;
    this.lastRawCode = null;
  }

  // Add a pass code feature to secu storage.
  public setPassCode(rawCode: string) {
    this.pC = rawCode && '' !== rawCode ? <string>Md5.hashStr(rawCode) : null;
    if (!this.cS) this.cS = environment.clientSecret;
    this.setupStorage('lvl1');
    this.storage.set('pC', this.pC);
    this.storage.set('cS', this.cS);
    this.lastEs = this.eS;
    this.lastRawCode = this.rawCode;
    this.rawCode = rawCode;
    if (this.pC && '' !== this.pC) {
      this.eS = this.cS + this.pC;
    } else {
      this.eS = null;
    }
    this.storage.set('eS', this.eS);
    if (this.lastEs !== this.eS) {
      let secuData = {};
      this.setupStorage('lastEs');
      this.storage.getAllKeys().forEach((k: string) => {
        if (!this.openDataKey.includes(k) && !this.lvl1SecuDataKey.includes(k)) {
          secuData[k] = this.storage.get(k);
          this.storage.remove(k);
        }
      });
      this.setupStorage('lvl2');
      Object.keys(secuData).forEach((k: string) => {
        this.storage.set(k, secuData[k]);
      });
    }
    this.setupStorage('lvl2');
    this.storage.set('rawCode', rawCode); // Setting passCode under level 2 secu, keeping real code hard to know...

    this.i18nService.get(extract('mb.secu-storage.setPassCode.success')).subscribe(t => {
      this.notif.success(t);
    });

    return of(true);
  }
  public getItem<T>(key: string, failback: any = null) {
    let i = null;
    try {
      i = this.storage.get(key);
    } catch (error) {
      // (async () => {
      //   localStorage.clear(); // Native one may work, next call may fail since encrypted data ?
      //   this.localStorage.clear().subscribe(() => {
      //     this.i18nService.get(extract('mb.param.notif.didCleanStorageDueErr')).subscribe(t => {
      //       this.notif.error(t);
      //     });
      //   });
      // })();
      this.storage.isLocked = true;
      logReview.error(error);
    }
    return of<T>(null === i ? failback : i);
  }
  public setItem<T>(key: string, value: any) {
    return of<T>(this.storage.set(key, value));
  }
  public removeItem<T>(key: string) {
    return of<T>(this.storage.remove(key));
  }

  public getItemHash(key: string) {
    return localStorage.getItem(key);
  }
}

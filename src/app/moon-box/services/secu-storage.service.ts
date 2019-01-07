// Copyright Monwoo 2018-2019, made by Miguel Monwoo, service@monwoo.com

import {
  Injectable,
  ViewContainerRef,
  NgZone,
  ElementRef,
  Renderer2,
  RendererFactory2,
  HostListener
} from '@angular/core';
import { environment } from '@env/environment';
import { forkJoin, of, interval } from 'rxjs';
import { Md5 } from 'ts-md5/dist/md5';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { MatDialog, MatDialogRef } from '@angular/material';
import { LockScreenComponent } from '@moon-box/components/lock-screen/lock-screen.component'; // TODO : remove circular référence by injecting in providers from module file ?
import { I18nService } from '@app/core';
import { extract } from '@app/core';
import { NotificationsService } from 'angular2-notifications';
import { BackendService } from '@moon-box/services/backend.service';
import { BehaviorSubject, ReplaySubject, from } from 'rxjs';
import { map, combineLatest, tap, mergeAll, debounce, debounceTime } from 'rxjs/operators';
import {
  ContextType,
  FormType,
  SessionStoreType,
  FormCallable,
  contextDefaults,
  sessionStoreInitialState
} from '@moon-box/services/secu-storage.session.model';
import { DynamicFormService } from '@ng-dynamic-forms/core';

import { Logger } from '@app/core/logger.service';
const logReview = new Logger('MonwooReview');

// https://github.com/softvar/secure-ls
declare const require: any; // To avoid typeScript error about require that don't exist since it's webpack level
const SecureLS = require('secure-ls');

@Injectable({
  providedIn: 'root'
})
export class SecuStorageService implements FormCallable {
  private storage: any = null;
  public lockDownTimeInMs: number = 12 * 60 * 1000; // 12 minutes en millisecondes
  private lastLockCheckDate: Date = null;
  public lockTargetContainer: ViewContainerRef = null;
  public isLocked: boolean = false;
  private lockDialogRef: MatDialogRef<LockScreenComponent> = null;
  private rawCode: string = '';
  private lastRawCode: string = '';
  public onUnlock: BehaviorSubject<void> = new BehaviorSubject(null);

  private eS: string = null;
  private lastEs: string = null;
  private pC: string = null;
  private cS: string = null;
  private debugStorage = false;

  private renderer: Renderer2 = null;

  constructor(
    private backend: BackendService,
    private dialog: MatDialog,
    private ngZone: NgZone,
    public i18nService: I18nService,
    public formService: DynamicFormService,
    private notif: NotificationsService,
    private localStorage: LocalStorage,
    private rendererFactory: RendererFactory2
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
    this.checkLock();
    this.setCurrentSession('').subscribe();
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
    } catch (error) {
      logReview.warn(error);
      this.storage.isLocked = true;
    }
  }

  public setupStorage(secuLvl: 'lvl1' | 'lvl2' | 'lastEs') {
    try {
      if (this.debugStorage) {
        this.storage = new SecureLS({ encodingType: '', isCompression: false });
        return;
      }
      switch (secuLvl) {
        case 'lvl1':
          {
            this.storage = new SecureLS({ encodingType: 'aes' });
            const lvlOk = this.storage.get('lvl1') || 'ok'; // Ensuring storage reading is set correctly (This line will throw error if none)
            this.storage.set('lvl1', lvlOk); // Forcing storage update on new setup by setting an item in the storage
          }
          break;
        case 'lvl2':
          {
            if (!!this.eS && '' !== this.eS) {
              this.storage = new SecureLS({
                encodingType: 'rc4',
                isCompression: true,
                encryptionSecret: this.eS + this.rawCode
              });
            } else {
              this.storage = new SecureLS({ encodingType: 'aes' });
            }
            const lvl2Ok = this.storage.get('lvl2') || 'ok'; // Ensuring storage reading is set correctly (This line will throw error if none)
            this.storage.set('lvl2', lvl2Ok); // Forcing storage update on new setup by setting an item in the storage
          }
          break;
        case 'lastEs':
          {
            if (!!this.lastEs && '' !== this.lastEs) {
              this.storage = new SecureLS({
                encodingType: 'rc4',
                isCompression: true,
                encryptionSecret: this.lastEs + this.lastRawCode
              });
            } else {
              this.storage = new SecureLS({ encodingType: 'aes' });
            }
            const lvlOk = this.storage.get('lastEs') || 'ok'; // Ensuring storage reading is set correctly (This line will throw error if none)
            this.storage.set('lastEs', lvlOk); // Forcing storage update on new setup by setting an item in the storage
          }
          break;
        default:
          break;
      }
      // const lastLvl = this.storage.get("lvl", false); // Ensuring storage reading is set correctly (This line will throw error if none)
      // this.storage.set("lvl", secuLvl); // Forcing storage update on new setup by setting an item in the storage
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
      logReview.warn(error);
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

  protected async lockOut() {
    this.setupStorage('lvl1'); // setting up lvl1 will remove lvl2 credentials, avoiding usage of storage while user is locked through pass code
    await this.backend.logout();
    this.isLocked = true;
    this.lastLockCheckDate = null;
  }

  public async showLockScreen(disableClose: boolean = true) {
    if (this.lockDialogRef) {
      // this.lockDialogRef.close();
      return; // Lock screen is already displayed, avoid touchy side effect of quick dev algo...
    }

    await this.lockOut();
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
    this.checkLock();

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
    await this.lockOut();
    await this.localStorage.clear().toPromise();
    this.pC = null;
    this.eS = null;
    this.cS = null;
    this.lastEs = null;
    this.rawCode = '';
    this.lastRawCode = '';
  }

  // https://gist.github.com/valentinkostadinov/5875467
  public toHex(s: string) {
    var h = '';
    for (var i = 0; i < s.length; i++) {
      h += s.charCodeAt(i).toString(16);
    }
    return h;
  }

  public fromHex(h: string) {
    var s = '';
    for (var i = 0; i < h.length; i += 2) {
      s += String.fromCharCode(parseInt(h.substr(i, 2), 16));
    }
    return s;
  }

  public async checkPassCodeValidity(rawCode: string) {
    this.rawCode = this.toHex(rawCode ? rawCode : '');
    // const isValid = !!(await this.getItem('lvl2', false).toPromise());
    let isValid = 'ok' === (await this.getItem<string>('lvl2', false).toPromise());
    if (isValid) {
      this.setPassCode(rawCode, false);
      this.onUnlock.next(null);
    } else {
      await this.lockOut();
    }
    return isValid;
  }

  public getLvl2Keys() {
    // return [
    //   "lvl2",
    // ];
    return this.storage.getAllKeys().filter((k: string) => {
      return {
        ...{ [k]: true },
        ...{
          language: false,
          _secure__ls__metadata: false,
          lastEs: false,
          lvl1: false,
          cS: false,
          eS: false,
          pC: false
        }
      }[k];
    });
  }

  // Add a pass code feature to secu storage.
  public setPassCode(rawCode: string, migrateData = true) {
    this.pC = rawCode && '' !== rawCode ? <string>Md5.hashStr(btoa(rawCode)) : null;
    // https://developer.mozilla.org/fr/docs/D%C3%A9coder_encoder_en_base64
    rawCode = this.toHex(rawCode ? rawCode : '');
    if (!this.cS) this.cS = environment.clientSecret;
    this.setupStorage('lvl1');
    this.storage.set('pC', this.pC);
    this.storage.set('cS', this.cS);
    this.lastRawCode = this.rawCode;
    this.rawCode = rawCode;
    if (this.pC && '' !== this.pC) {
      this.eS = this.cS + this.pC;
    } else {
      this.eS = null;
    }
    this.storage.set('eS', this.eS);
    if (migrateData && this.lastEs !== this.eS) {
      let secuData = {};
      this.setupStorage('lastEs');
      this.getLvl2Keys().forEach((k: string) => {
        if (!this.openDataKey.includes(k) && !this.lvl1SecuDataKey.includes(k)) {
          secuData[k] = this.storage.get(k);
          this.storage.remove(k);
        }
      });
      this.setupStorage('lvl2');
      logReview.debug('Migrate data to lvl2 : ', secuData);

      Object.keys(secuData).forEach((k: string) => {
        this.storage.set(k, secuData[k]);
      });
    }
    this.lastEs = this.eS;
    // no need to reset lvl2 anymore since part of getLvl2Keys
    // const lvl2Ok = this.storage.remove('lvl2'); // Ensuring storage lvl2 get's encoded under new encryption key
    // this.setupStorage('lvl2');
    // Below = no meanings, since rawCode needed to open level 2....
    // this.storage.set('rawCode', rawCode); // Setting passCode under level 2 secu, keeping real code hard to know...
    this.setupStorage('lvl2');

    this.i18nService.get(extract('mb.secu-storage.setPassCode.success')).subscribe(t => {
      this.notif.success(t);
    });

    return of(true);
  }
  public getItem<T>(key: string, failback: any = null) {
    let i = null;
    try {
      this.setupStorage('lvl2');
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
      logReview.warn(error);
    }
    return of<T>(null === i ? failback : i);
  }
  public setItem<T>(key: string, value: any) {
    this.setupStorage('lvl2');
    return of<T>(this.storage.set(key, value));
  }
  public removeItem<T>(key: string) {
    this.setupStorage('lvl2');
    return of<T>(this.storage.remove(key));
  }

  public getItemHash(key: string) {
    return localStorage.getItem(key);
  }

  private session: ContextType = null;
  private sessIds: SessionStoreType = sessionStoreInitialState;
  // May return null session if not setted up...
  public getCurrentSession() {
    // TODO : do not return null session, await for it to be setup from constructor...
    return this.session;
  }
  private session$: ReplaySubject<ContextType> = new ReplaySubject<ContextType>();
  public onCurrentSession$() {
    // TODO : do not return null session, await for it to be setup from constructor...
    return this.session$;
  }

  public setCurrentSession(sessId: string) {
    this.sessIds[sessId] = new Date();
    return this.getItem<SessionStoreType>('session-ids').pipe(
      combineLatest(
        from(
          contextDefaults(this, {
            currentSession: sessId
          })
        ).pipe(
          tap(defaultF => {
            logReview.debug('Having session defaults : ', defaultF);
          })
        )
      ),
      map(([sessIds, freshDefaults]) => {
        sessIds = sessIds || sessionStoreInitialState;
        sessIds[sessId] = this.sessIds[sessId];
        this.sessIds = sessIds;
        this.session = freshDefaults;
        this.session$.next(this.session);
        return this.setItem('session-ids', this.sessIds);
      }),
      mergeAll(),
      map(didSet => {
        logReview.debug('Did set session Ids : ', didSet);
        return true;
      })
    );
  }

  addNewSessionFromForm(e: any, ctx: any) {
    const data = <FormType>this.session.group.value;
    const sessId = data.currentSession;
    logReview.debug('Will add session : ', sessId, data);
    this.setCurrentSession(sessId).subscribe(); // TODO : OK or strange to need subscribe ? well, instinctivly i forget it and it take space...
  }

  private sessionChangeHandler$ = new ReplaySubject<HTMLFormElement>();
  onSessionChange(e: any, formRef: HTMLFormElement) {
    // TODO : find a better way to check ReplaySubject is empty (no first emit)
    if (!this.sessionChangeHandler$.observers.length) {
      this.sessionChangeHandler$
        .pipe(
          debounceTime(500),
          tap((formRef: HTMLFormElement) => {
            if (this.session.group.valid) {
              const sessData = <FormType>this.session.group.value;
              const keyExist = !!this.sessIds[sessData.currentSession];
              if (keyExist) {
                this.renderer.addClass(formRef, 'condensed');
              } else {
                this.renderer.removeClass(formRef, 'condensed');
              }
            }
          })
        )
        .subscribe();
    }
    this.sessionChangeHandler$.next(formRef);
    // TODO : check form validity : must not rewrite existing session ids...
    // + regex formats ?
    // logReview.debug('Checking Session form validity : ', this.session);
  }
  private isSessionFocused = false;
  private sessionFormRef: HTMLFormElement = null;
  onSessionFocus(e: any, formRef: HTMLFormElement) {
    this.isSessionFocused = true;
    this.sessionFormRef = formRef;
    // logReview.debug('Did focus session form : ', formRef);
  }
  onSessionBlur(e: any, formRef: HTMLFormElement) {
    this.isSessionFocused = false;
    logReview.assert(
      formRef === this.sessionFormRef,
      'Having buggy session Blur, missing balenced onSessionFocus listener ?'
    );
    this.sessionFormRef = null;
    // logReview.debug('Did blur session form : ', formRef);
  }
  // TODO : why work in component and not in services :
  // Missing some Deps ?
  // @HostListener('window:keyup', ['$event']) ?
  // @HostListener('document:keyup', ['$event'])
  onSessionKeyUp(e: any) {
    // logReview.debug('Having key up : ', e);
    if (this.isSessionFocused) {
      this.onSessionChange(e, this.sessionFormRef);
      // logReview.debug('Did review key up for : ', this.sessionFormRef);
    }
  }

  getSessionIds$() {
    // This : less reliable than object's memory
    // return this.getItem<SessionStoreType>('session-ids');
    return of(this.sessIds);
  }
}

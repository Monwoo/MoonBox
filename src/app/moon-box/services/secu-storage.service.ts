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
import { forkJoin, of, interval, Subscription, throwError, Observable } from 'rxjs';
import { Md5 } from 'ts-md5/dist/md5';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { MatDialog, MatDialogRef } from '@angular/material';
import { LockScreenComponent } from '@moon-box/components/lock-screen/lock-screen.component'; // TODO : remove circular référence by injecting in providers from module file ?
import { I18nService } from '@app/core';
import { extract } from '@app/core';
import { NotificationsService } from 'angular2-notifications';
import { BackendService } from '@moon-box/services/backend.service';
import { BehaviorSubject, ReplaySubject, from } from 'rxjs';
import {
  map,
  combineLatest,
  tap,
  mergeAll,
  concatMap,
  debounceTime,
  catchError,
  takeUntil,
  delay
} from 'rxjs/operators';
import {
  ContextType,
  FormType,
  SessionStoreType,
  ItemStoreType,
  FormCallable,
  contextDefaults,
  sessionStoreInitialState
} from '@moon-box/services/secu-storage.session.model';
import { DynamicFormService } from '@ng-dynamic-forms/core';

import { Logger } from '@app/core/logger.service';
import { DynamicMaterialFormGroupComponent } from '@ng-dynamic-forms/ui-material';
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

  private _isLocked: boolean = false;
  public get isLocked(): boolean {
    return this._isLocked;
  }
  public set isLocked(should: boolean) {
    const asyncSetup = () => {
      this._isLocked = should;
      if (!should) {
        this.onUnlock.next(null);
      }
    };
    if (should) {
      // Do not wait to lockout
      asyncSetup();
    } else {
      asyncSetup(); // TODO : fix below error...
      return;
      // May wait for UI rendering for lock release :
      // using delay and ngZone.run to try to avoid :
      // ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked.
      // Previous value: 'ngIf: true'. Current value: 'ngIf: false'.
      // for first-page.component.html:7 ?
      // => below have no effect : ...
      of().pipe(
        delay(0),
        tap(() => {
          this.ngZone.run(() => {
            asyncSetup();
          });
        })
      );
    }
  }

  private lockDialogRef: MatDialogRef<LockScreenComponent> = null;
  private rawCode: string = '';
  private lastRawCode: string = '';
  public onUnlock: ReplaySubject<void> = new ReplaySubject();
  // TODO: design it to be nice to integrate in parameters component...
  // public secuKeys: string[] = [
  //   "boxesIdxs", "moon-box-filters", "boxes", "moon-box-messages"
  //   , "session-ids", "", "", ""
  //   , "", "", "", ""
  //   , "", "", "", ""
  // ]
  private notSessionableKeys = {
    'session-ids': true,
    lvl2: true,
    lastEs: true
  };

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
    this.reloadLastSession();
    // this.onUnlock.subscribe(() => {
    //   // this.reloadLastSession(); // Infinit loop, since using same event to force view refresh...
    // });
    // this.setCurrentSession(this.defaultSessionId).subscribe();
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
            const lvl2Ok = (this.storage.get('lvl2') || { [this.defaultSessionId]: 'ok' })[this.defaultSessionId]; // Ensuring storage reading is set correctly (This line will throw error if none)
            this.storage.set('lvl2', { [this.defaultSessionId]: lvl2Ok }); // Forcing storage update on new setup by setting an item in the storage
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
            const lvlOk = (this.storage.get('lastEs') || { [this.defaultSessionId]: 'ok' })[this.defaultSessionId]; // Ensuring storage reading is set correctly (This line will throw error if none)
            this.storage.set('lastEs', { [this.defaultSessionId]: lvlOk }); // Forcing storage update on new setup by setting an item in the storage
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

    // Scroll to top to avoid design issue if lock down on scrolled page :
    window.scrollTo(0, 0);

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

    if (!this.pC || this.pC === '') {
      this.isLocked = false;
      return; // No need of lock screen since no PassCode defined
    }
    const currentDate = new Date();
    if (!this.lastLockCheckDate || currentDate.getTime() - this.lastLockCheckDate.getTime() > this.lockDownTimeInMs) {
      this.isLocked = true;
      this.showLockScreen();
    } else {
      this.isLocked = false;
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
    this.sessIds = sessionStoreInitialState;
    this.setItem('session-ids', this.sessIds).subscribe(() => {
      this.setCurrentSession(this.defaultSessionId).subscribe();
    });
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
    const lvl2 = await this.getItem<string>('lvl2', null)
      .pipe(
        catchError((e: any, caugh) => {
          return of(-1);
        })
      )
      .toPromise();
    // const isValid = !!(await this.getItem('lvl2', false).toPromise());
    let isValid = 'ok' === lvl2;
    if (isValid) {
      this.setPassCode(rawCode, false);
      this.reloadLastSession();
      // this.onUnlock.next(null); // TODO : refactor : make onUnlock private, will break stuff if called outside of     this.reloadLastSession();
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
  public getItem<T>(key: string, failback: T = null) {
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
      this.storage.isLocked = true; // TODO : push lock event instead... bool may not be enough to refresh all
      logReview.warn(error);
      // We're not in async code yet, will not pop up in RxJs call stack if done as below :
      // throw error; // Throw back errors on get to avoid next behaviors of setting item as null for wrong passcode
      return throwError(error);
    }
    return null === i
      ? of<T>(failback)
      : of<ItemStoreType<T>>(i).pipe(
          map((val: ItemStoreType<T>) => {
            const sessId = this.getSessId(key);
            return val.hasOwnProperty(sessId) ? val[sessId] : failback;
          })
        );
  }
  protected defaultSessionId = '_';
  protected getSessId(targetKey: string = null) {
    const sessId =
      this.session && !(targetKey in this.notSessionableKeys)
        ? this.currentSession // this.session.group.value.currentSession
        : this.defaultSessionId;
    return sessId;
  }
  public setItem<T>(key: string, value: T) {
    this.setupStorage('lvl2');
    const sessId = this.getSessId(key);
    const i = <ItemStoreType<T>>this.storage.get(key) || {};
    i[sessId] = value;
    return of<T>(this.storage.set(key, i));
  }
  public removeItem<T>(key: string) {
    this.setupStorage('lvl2');
    const sessId = this.getSessId(key);
    const i = <ItemStoreType<T>>this.storage.get(key) || {};
    delete i[sessId];
    if (Object.keys(i).length) {
      return of<T>(this.storage.set(key, i));
    } else {
      return of<T>(this.storage.remove(key));
    }
  }

  public getItemHash(key: string) {
    return localStorage.getItem(key);
  }

  private session: ContextType = null;
  private sessIds: SessionStoreType = sessionStoreInitialState;

  // public getSessIds() {
  //   return this.sessIds;
  // }

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

  public reloadLastSession() {
    this.getItem<SessionStoreType>('session-ids', this.sessIds)
      .pipe(
        // catchError((e: any, caugh)=> { return of(-1); }),
        tap(sessIds => {
          // if (-1 === sessIds) {
          //   return;
          // }
          sessIds = sessIds;
          let sessId = null;
          this.sessIds = <SessionStoreType>sessIds;
          const sessKeys = Object.keys(sessIds);
          let lastSessTime = 0;
          for (let i = 0; i < sessKeys.length; i++) {
            const sessIdLookup = sessKeys[i];
            // TODO : SessionStoreType is not enouth to transform date extract with current data system... :
            // Manual setup for now :
            // const sessionTime = this.sessIds[sessIdLookup];
            const sessionTime = new Date(this.sessIds[sessIdLookup]);
            if (sessionTime.getTime() > lastSessTime) {
              sessId = sessIdLookup;
              lastSessTime = sessionTime.getTime();
            }
          }
          this.setCurrentSession(sessId ? sessId : this.defaultSessionId).subscribe();
        }),
        catchError((e: any, caugh) => {
          return of(-1);
        })
      )
      .subscribe();
  }

  private currentSession = this.defaultSessionId;
  public getCurrentSessionId() {
    return this.currentSession;
  }

  private sessionAvailableForSetup$ = new ReplaySubject<void>();
  // TODO : allow readonly only for public expose
  public isSessionGettingSetedUp = false;
  public setCurrentSession(sessId: string): Observable<boolean> {
    if (this.isSessionGettingSetedUp) {
      logReview.debug('Postponing set Current Session');
      return from([debounceTime(2000), takeUntil(this.sessionAvailableForSetup$), this.setCurrentSession(sessId)]).pipe(
        concatMap((input: any, idx: number) => {
          return input; // Only using concatMap to ensure tasks orders...
        }),
        mergeAll(),
        map(() => true)
      );
    }
    logReview.debug('Will set Current Session');
    this.isSessionGettingSetedUp = true;
    this.sessIds[sessId] = new Date().toISOString();
    // return forkJoin(
    // https://github.com/ReactiveX/rxjs
    // https://rxjs.dev/api
    // http://reactivex.io/rxjs/manual/index.html
    return from([
      this.getItem<SessionStoreType>('session-ids').pipe(
        map(sessIds => {
          sessIds = sessIds || sessionStoreInitialState;
          sessIds[sessId] = this.sessIds[sessId];
          this.sessIds = sessIds;
          logReview.debug('Did set session ids to : ', this.sessIds);
          return this.setItem('session-ids', this.sessIds).pipe(
            map(() => {
              return of(this.sessIds);
            })
          );
        })
      ),
      from(
        contextDefaults(this, {
          currentSession: sessId
        })
      ).pipe(
        tap(freshDefaults => {
          logReview.debug('Having session Form defaults : ', freshDefaults);
          this.session = freshDefaults;
          // Refresh current session by emitting a onUnlock event
          // if app is already unlocked only :
          if (!this.isLocked) {
            this.isLocked = false; // already false, yhea, but having setter emmiting the unlock event ;)
          }
          this.session$.next(this.session);
        })
      )
    ])
      .pipe(
        concatMap((input: any, idx: number) => {
          return input; // Only using concatMap to ensure tasks orders...
        })
        // tap(defaultF => {
        //   logReview.debug('Sync login from filters : ', defaultF);
        // })
      )
      .pipe(
        debounceTime(500),
        map(([sessIds, freshDefaults]) => {
          this.i18nService.get(extract('mb.secu-storage.setSession.success')).subscribe(t => {
            this.notif.success(t);
          });
          this.isSessionFocused = false;
          this.currentSession = sessId;
          // set up group value to lose focus on session set OK
          this.session.group.value.currentSession = sessId;
          logReview.debug('Did end session setup : ', [sessIds, freshDefaults]);
          return [sessIds, freshDefaults];
        }),
        // mergeAll(), // To much ? already ended from fork join ?
        map(didSet => {
          logReview.debug('Did set session Ids : ', didSet);
          this.isSessionGettingSetedUp = false;
          // Reset frontend UI by sending a secu onUnlock event.
          // if (!this.isLocked)
          this.onUnlock.next(null);
          this.sessionAvailableForSetup$.next();
          return true;
        })
      );
  }

  // public secuKeys: string[] = [
  //   "boxesIdxs", "moon-box-filters", "boxes", "moon-box-messages"
  //   , "session-ids", "", "", ""
  //   , "", "", "", ""
  //   , "", "", "", ""
  // ]
  // TODO : refactor : remove duplications about SessionnableKeys and lvl2 keys ?
  public async getSessionableKeys() {
    let secuKeys: string[] = ['boxesIdxs', 'moon-box-filters', 'boxes', 'moon-box-messages', 'session-ids'];
    const boxesIdxs = (await this.getItem<string[]>('boxesIdxs', []).toPromise()).map(id => 'moon-box-' + id);
    secuKeys = secuKeys.concat(boxesIdxs);
    return secuKeys;
  }

  removeSessionFromForm(e: any, ctx: any, formRef: HTMLFormElement) {
    (async () => {
      const data = <FormType>this.session.group.value;
      const sessId = data.currentSession;
      logReview.assert(!!this.sessIds[sessId], 'Should not try to remove unknown session : ', sessId, this.sessIds);
      const secuKeys = await this.getSessionableKeys();
      // secuKeys.forEach(k => {
      //   this.removeItem(k); // TODO : need to subscribe ?
      // });
      for (let i = 0; i < secuKeys.length; i++) {
        const k = secuKeys[i];
        await this.removeItem(k).toPromise();
      }
      delete this.sessIds[sessId];
      this.setItem('session-ids', this.sessIds)
        .pipe(
          tap(() => {
            logReview.debug('Did remove session id : ', sessId, this.sessIds);
            this.reloadLastSession();
          })
        )
        .subscribe();
    })();
  }

  addNewSessionFromForm(e: any, ctx: any, formRef: HTMLFormElement) {
    this.sessionFormRef = formRef;
    (async () => {
      const data = <FormType>this.session.group.value;
      const sessId = data.currentSession;
      logReview.assert(!this.sessIds[sessId], 'Should not try to add existing session : ', sessId, this.sessIds);
      const currentSession = this.session.group.value.currentSession;
      if (data.addSession.copyCurrentSession) {
        // TODO : below is breaking all fixed previous bugs ?
        const secuKeys = await this.getSessionableKeys();
        const lastSession = this.currentSession;
        logReview.debug('Will copy current session : ', lastSession, this.sessIds);
        for (let i = 0; i < secuKeys.length; i++) {
          const k = secuKeys[i];
          this.currentSession = lastSession;
          const cpy = await this.getItem(k).toPromise();
          this.currentSession = currentSession;
          await this.setItem(k, cpy)
            .pipe(tap(() => {}))
            .toPromise();
        }
      }
      this.currentSession = currentSession;
      logReview.debug('Will add session : ', sessId, data);
      this.setCurrentSession(sessId).subscribe();
    })();
  }

  private sessionSubcriber: Subscription = null;
  private sessionChangeHandler$ = new ReplaySubject<HTMLFormElement>();
  // https://stackoverflow.com/questions/46360927/add-listener-when-autocomplete-component-suggestion-panel-closes-in-angular-2
  // https://github.com/angular/material2/issues/3645
  // https://github.com/udos86/ng-dynamic-forms/blob/ae2ee717cc8e1861d02ac38dbe259517d43d91a5/packages/ui-material/src/input/dynamic-material-input.component.ts
  // https://medium.com/@tkssharma/understanding-viewchildren-viewchild-contentchildren-and-contentchild-b16c9e0358e
  // https://stackoverflow.com/questions/37635404/angular-2-how-to-trigger-a-method-on-a-child-from-the-parent
  onSessionChange(
    e: any,
    formRef: HTMLFormElement,
    form: DynamicMaterialFormGroupComponent,
    updateSession: boolean = true
  ) {
    // TODO : find a better way to check ReplaySubject is empty (no first emit)
    // if (!this.sessionChangeHandler$.observers.length) {
    // Well, updateSession will keep first init value if this kine of design pattern
    // having buggy effect since need to be real-time argument...
    // Quick hack : unsubscribe old and new subscribtion on each call...
    // }
    if (this.sessionSubcriber) {
      this.sessionSubcriber.unsubscribe();
    }
    this.sessionSubcriber = this.sessionChangeHandler$
      .pipe(
        debounceTime(500),
        tap((formRef: HTMLFormElement) => {
          if (this.session.group.valid) {
            const sessData = <FormType>this.session.group.value;
            const keyExist = !!this.sessIds[sessData.currentSession];
            if (keyExist) {
              this.renderer.addClass(formRef, 'condensed');
              if (updateSession) {
                this.setCurrentSession(sessData.currentSession).subscribe();
              }
            } else {
              this.renderer.removeClass(formRef, 'condensed');
            }
          }
        })
      )
      .subscribe();
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
      this.onSessionChange(e, this.sessionFormRef, null, false);
      // logReview.debug('Did review key up for : ', this.sessionFormRef);
    }
  }

  getSessionIds$() {
    // This : less reliable than object's memory
    // return this.getItem<SessionStoreType>('session-ids');
    return of(this.sessIds);
  }
}

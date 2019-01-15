// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable, HostListener, NgZone } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { concatMap, catchError, shareReplay, tap } from 'rxjs/operators';
import { from, of, Observable } from 'rxjs';
import { environment } from '@env/environment';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { NotificationsService } from 'angular2-notifications';
import { extract } from '@app/core';
import { I18nService } from '@app/core';
import { FormType as LoginFormType } from '@moon-box/components/box-reader/login-form.model';
import { CookieService } from 'ngx-cookie-service';
import * as moment from 'moment';
import { Logger } from '@app/core/logger.service';
const logReview = new Logger('MonwooReview');

export type ProviderID = 'OVH' | 'GoDaddy' | 'LWS' | 'YopMail' | 'Yahoo' | 'Unknown' | 'GoogleApi';

const httpOptions = {
  headers: new HttpHeaders({
    //'Content-Type': 'application/json'
    // JWT injected => 'Authorization': 'my-auth-token'
  }),
  // https://github.com/angular/angular/issues/24283
  // https://stackoverflow.com/questions/50210662/angular-6-httpclient-post-with-credentials
  withCredentials: true
};

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  apiBaseUrl: string = environment.moonBoxBackendUrl;
  apiUsername: string = null;
  private fetchSize = 21;

  public providers = {
    // https://www.materialui.co/icons
    /*
    https://www.materialui.co/icon/sentiment-neutral
    https://www.materialui.co/icon/sentiment-very-dissatisfied
    https://www.materialui.co/icon/sentiment-dissatisfied
    https://www.materialui.co/icon/sentiment-very-satisfied
    https://www.materialui.co/icon/airplanemode-inactive
    https://www.materialui.co/icon/signal-cellular-connected-no-internet-4-bar
    https://www.materialui.co/icon/signal-wifi-statusbar-connected-no-internet-1
    https://www.materialui.co/icon/signal-wifi-statusbar-not-connected
    https://www.materialui.co/icon/notifications_paused
    */
    // TODO : all https://accedinfo.com/dns-pop-imap/ ? how to keep simple then ?...
    OVH: {
      name: extract('O.V.H.'),
      serverUrl: 'SSL0.OVH.NET',
      serverPort: '993',
      usability: 'notifications_paused',
      extraCmt: extract('Not tested yet')
    },
    GoDaddy: {
      name: extract('GoDaddy'),
      serverUrl: 'imap.secureserver.net',
      serverPort: '993',
      usability: 'notifications_paused',
      extraCmt: extract('mb.backend.goDaddy.extraCmt')
    },
    LWS: {
      name: extract('L.W.S.'),
      serverUrl: 'mail07.lwspanel.com',
      serverPort: '993',
      usability: 'sentiment_very_satisfied',
      extraCmt: extract('Seem to work')
    },
    YopMail: {
      name: extract('YopMail'),
      serverUrl: 'http://www.yopmail.com?{username}',
      serverPort: '80',
      usability: 'signal_cellular_connected_no_internet_4_bar',
      extraCmt: extract('No IMAP available, connect via : www.yopmail.com')
    },
    Yahoo: {
      name: extract('Yahoo'),
      serverUrl: 'imap.mail.yahoo.com',
      serverPort: '993',
      usability: 'notifications_paused',
      extraCmt: extract('Not tested yet')
    },
    Hotmail: {
      name: extract('Hotmail'),
      serverUrl: 'imap-mail.outlook.com',
      serverPort: '993',
      usability: 'notifications_paused',
      extraCmt: extract('Not tested yet')
    },
    Unknown: {
      name: extract('Unknown'),
      serverUrl: '',
      serverPort: '',
      usability: 'notifications_paused',
      extraCmt: extract('Not tested yet')
    },
    GoogleApi: {
      name: extract('Api Google'),
      serverUrl: '<MoonBox backend>',
      serverPort: '',
      usability: 'sentiment_very_satisfied',
      extraCmt: extract('Seem to work')
    }
  };

  constructor(
    private http: HttpClient,
    private storage: LocalStorage,
    private i18nService: I18nService,
    private notif: NotificationsService,
    private cookieService: CookieService,
    private ngZone: NgZone
  ) {
    this.generateApiUsername();
    // Quick hack, since host listener to gets debug, TODO : HostListener bad usage to fix ?
    window.addEventListener('message', (e: any) => this.authListener(e));
    window.addEventListener('beforeunload', (e: any) => this.unloadListener(e));
    this.storage.getItem('backend.fetchSize').subscribe((storedSize: number) => {
      this.fetchSize = storedSize || this.fetchSize; // Keep default size if fail to fetch
    });
  }

  generateApiUsername() {
    this.apiUsername =
      moment().format('YYYYMMDDHHmmss') +
      (Math.random().toString(36) + '12121212121212').slice(2, 14) +
      '@moon-box.monwoo.com';
  }

  protected clearLocalSession() {
    // Clear session connection with the backend on frontend side :
    this.storage.removeItem('access_token');
    this.cookieService.delete('PHPSESSID'); // may fail some times, below to ensure removal :
    // Clear session connection with the backend on backend front Api side :
    // Inspired from :
    // https://stackoverflow.com/questions/2144386/how-to-delete-a-cookie/2138471#2138471
    // System D logout in case network fails :
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
  }

  // private _keepLoading = false;
  public keepLoading$() {
    return this.storage.getItem<boolean>('keep-loading');
  }

  public set keepLoading(keep: boolean) {
    this.storage.setItem('keep-loading', keep);
    logReview.debug('Should keep loading : ', keep);
  }

  logout() {
    this.generateApiUsername(); // Switching current api username, in case logout call to server did fail to reach...
    // https://www.learnrxjs.io/operators/error_handling/catch.html
    // regular log out (may fail if network issue) :
    return this.http
      .get(this.apiBaseUrl + '/api/moon-box/logout', {
        ...httpOptions,
        ...{
          params: new HttpParams()
          // .set('ctx', ctx)
        }
      })
      .pipe(
        tap((resp: any) => {
          this.clearLocalSession();
        }),
        catchError((error: any, caught: Observable<any>) => {
          this.clearLocalSession();
          return of('Did fail regular logout');
        })
      );
  }

  login(loginData: LoginFormType) {
    // if (loginData.selectedProvider === 'Unknown') {
    //   this.i18nService.get(extract('mb.backend.connector.unknown')).subscribe(t => {
    //     this.notif.warn('Backend', t, {
    //       timeOut: 6000
    //     });
    //   });

    //   throw new Error("Can't login with Unknown provider");
    // }

    // loginData._password = '*' + '#__hash'
    // + (Math.random().toString(36) + '777777777').slice(2, 9) + btoa(loginData._password);
    this.bulkCount[loginData._username] = 0;

    return (
      this.http
        .post<any>(
          this.apiBaseUrl + '/api/login',
          {
            ...loginData,
            ...{
              apiUsername: this.apiUsername
            }
          },
          httpOptions
        )
        // this is just the HTTP call,
        // we still need to handle the reception of the token
        .pipe(
          tap((payload: any) => {
            this.storage
              .setItem('access_token', payload.token)
              .pipe(
                tap(_ => {
                  logReview.debug('Access token saved');
                })
              )
              .subscribe();
          }),
          shareReplay()
        )
    );
  }

  bulkCount: {} = {};
  fetchMsg(provider: string, username: string, page: string = '1', limit: number = null) {
    limit = limit || this.fetchSize;
    logReview.assert(limit > 0, 'Fetch Limit must be > 1', limit, this);

    return (
      this.http
        .post<any>(
          this.apiBaseUrl + '/api/messages',
          {
            provider: provider,
            username: username
          },
          {
            ...httpOptions,
            ...{
              params: new HttpParams()
                // .set('ctx', JSON.stringify(ctx))
                .set('limit', limit.toString())
                .set('page', page.toString())
            }
          }
        )
        // this is just the HTTP call,
        // we still need to handle the reception of the token
        .pipe(
          concatMap(msgs => {
            const dataUsername = msgs['dataUser'];
            return from(
              new Promise(resolve => {
                if ('bulkCount' in msgs) {
                  this.bulkCount[dataUsername] = this.bulkCount[dataUsername] || 0;
                  this.bulkCount[dataUsername] += msgs.bulkCount;
                  msgs.numResults = this.bulkCount[dataUsername];
                  msgs.totalCount = this.bulkCount[dataUsername];
                }
                (async () => {
                  if (msgs.needAuthRedirect) {
                    resolve(await this.promptGApiAuth(msgs, provider, username, page, limit));
                  } else {
                    resolve(msgs);
                  }
                })();
              })
            );
          }),
          tap(msgs => {
            logReview.debug('Did fetch messages for : ', username, ' => ', msgs);
          })
          // catchError((err, caugth) => {
          //   logReview.error('Having fetch error : ', err);
          //   throw err;
          // }),
        )
    );

    // return this.http.get(this.apiBaseUrl + 'api/moon-box/data_imap/submit_refresh', {
    //   ...httpOptions,
    //   ...{
    //     params: new HttpParams()
    //       // .set('ctx', JSON.stringify(ctx))
    //       .set('limit', limit.toString())
    //       .set('page', page.toString())
    //       .set('username', username) // TODO : may be better to submit by post ?
    //   }
    // });

    // return forkJoin(
    //   this.http.post(this.apiBaseUrl + 'api/login', ctx.auth, httpPostOptions).pipe(
    //     tap(loginStatus => {
    //       console.log(loginStatus);
    //     })
    //   ),
    //   this.http.get(this.apiBaseUrl + 'api/messages')
    // );
  }

  @HostListener('window:message', ['$event'])
  authListener(e: any) {
    let data = e.data;
    let dfrom = data.from;
    let succed = data.succed;
    if ('GApiAuthResponse' === dfrom) {
      logReview.debug('Having GApiAuthResponse', e);
      if (succed) {
        this.fetchMsg(
          this._queryResolution.provider,
          this._queryResolution.username,
          this._queryResolution.page,
          this._queryResolution.number
        )
          .pipe(
            concatMap(msgs => {
              return from(
                new Promise(resolve => {
                  (async () => {
                    resolve(await this.resolveLastApiAuth(msgs));
                  })();
                })
              );
            }),
            catchError(async (error: any, caught: Observable<any>) => {
              await this.rejectLastApiAuth();
              throw error;
              // return of('Did fail regular logout');
            })
          )
          .subscribe();
      } else {
        this.i18nService
          .get(extract('mb.backend.notif.connection fail {from}'), {
            from: dfrom
          })
          .subscribe(t => {
            this.notif.error('Backend', t, {
              timeOut: 6000
            });
          });
        this.rejectLastApiAuth().then();
      }
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadListener(e: any) {
    this.rejectLastApiAuth();
  }

  _rejectLastApiAuth: (reason?: any) => void = null;
  async rejectLastApiAuth() {
    logReview.debug('Reject last auth');
    if (this.lastApiAuthWindow) {
      this._rejectLastApiAuth();
      this._resolveLastApiAuth = null;
      this._rejectLastApiAuth = null;
      this.lastApiAuthWindow.close();
      this.lastApiAuthWindow = null;
      this._queryResolution = {};
    }
  }
  _resolveLastApiAuth: (reason?: any) => void = null;
  _queryResolution: any;
  async resolveLastApiAuth(resolution: any) {
    logReview.debug('Resolve last auth', resolution);
    let res: any = {};
    if (this.lastApiAuthWindow) {
      res = await this._resolveLastApiAuth(resolution);
      this._resolveLastApiAuth = null;
      this._rejectLastApiAuth = null;
      this.lastApiAuthWindow.close();
      this.lastApiAuthWindow = null;
      this._queryResolution = {};
    }
    return res;
  }
  lastApiAuthWindow: any = null;
  promptGApiAuth(config: any, provider: string, username: string, page: string = '1', limit: number = null) {
    limit = limit || this.fetchSize;
    logReview.assert(limit > 0, 'Fetch Limit must be > 1', limit, this);
    // TODO : add timeout for Auth + auto-close winwdow => will remove buggy infinit loader on user closing Auth window...
    // => re-spawn on user ACTIVITY to avoid closing the window while he do stuff
    // + find quick hack to detect closed window...
    /*Return messages*/
    return new Promise<any>((resolve, reject) => {
      (async () => {
        await this.rejectLastApiAuth();

        // TODO refactor ? => use
        // const remote = require('electron').remote;
        // const BrowserWindow = remote.BrowserWindow;
        // https://github.com/maximegris/angular-electron/issues/58

        // TODO : ?
        // https://dev.to/bobnadler/embedding-angular-components-into-a-legacy-web-app-2ff5
        // http://www.processinginfinity.com/weblog/2016/08/18/MessageBus-Pattern-in-Angular2-TypeScript

        // http://embed.plnkr.co/dz1A1h/
        // http://stackoverflow.com/questions/18064543/compile-angular-on-an-element-after-angular-compilation-has-already-happened
        // https://medium.com/@adrianfaciu/using-the-angular-router-to-navigate-to-external-links-15cc585b7b88
        // const authWindow = window.open(config.redirect, '_blank', 'toolbar=0,width=300,height=200');
        this._resolveLastApiAuth = resolve;
        this._rejectLastApiAuth = reject;
        this._queryResolution = { provider: provider, username: username, page: page, limit: limit };
        this.lastApiAuthWindow = window.open(config.redirect, '_blank', 'toolbar=0');
        if (this.lastApiAuthWindow) {
          this.ngZone.run(() => {
            // Avoiding iframe cors issue ? or error poping for other reason ?
            this.lastApiAuthWindow.onload = (e: any) => {
              logReview.error('Did open authentification window');
              // this.rejectLastApiAuth = null;
              // this.lastApiAuthWindow = null;
              // resolve({});
            };
            this.lastApiAuthWindow.onclose = (e: any) => {
              logReview.error('User did close auth window'); // May not be always called....
              this.rejectLastApiAuth();
            };
            // this.lastApiAuthWindow.onunload = e => {
            //   logReview.error('Auth window unload');
            //   resolve({});
            // };
          });
        } else {
          this.i18nService.get(extract('mb.backend.notif.failOpenAuthWindow')).subscribe(t => {
            this.notif.error('Backend', t, {
              timeOut: 6000
            });
          });
          logReview.error('Fail to open authentification windoww', config);
          await this.rejectLastApiAuth();
        }
      })();
    });
  }

  getFetchSize() {
    return this.fetchSize;
  }
  setFetchSize(newSize: number) {
    this.fetchSize = newSize;
    this.storage.setItem('backend.fetchSize', this.fetchSize).subscribe(() => {
      this.i18nService
        .get(extract('mb.backend.notif.setFetchSize{newSize}'), {
          newSize: this.fetchSize
        })
        .subscribe(t => {
          this.notif.info('Backend', t);
        });
    });
  }

  // TODO ?
  // => https://github.com/abacritt/angularx-social-login#readme
  // https://developers.facebook.com/
  // https://www.npmjs.com/package/angular-6-social-login
  // https://developers.facebook.com/docs/graph-api/reference/v3.2/message
  // https://developers.facebook.com/docs/graph-api/reference/v3.2/user/feed
}

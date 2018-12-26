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

  public providers = {
    // TODO : all https://accedinfo.com/dns-pop-imap/ ? how to keep simple then ?...
    OVH: {
      name: extract('O.V.H.'),
      serverUrl: 'SSL0.OVH.NET',
      serverPort: '993'
    },
    GoDaddy: {
      name: extract('GoDaddy'),
      serverUrl: 'imap.secureserver.net',
      serverPort: '993'
    },
    LWS: {
      name: extract('L.W.S.'),
      serverUrl: 'mail07.lwspanel.com',
      serverPort: '993'
    },
    YopMail: {
      name: extract('YopMail'),
      serverUrl: 'http://www.yopmail.com?{username}',
      serverPort: '80'
    },
    Yahoo: {
      name: extract('Yahoo'),
      serverUrl: 'imap.mail.yahoo.com',
      serverPort: '993'
    },
    Unknown: {
      name: extract('Unknown'),
      serverUrl: '',
      serverPort: ''
    },
    GoogleApi: {
      name: extract('Api Google'),
      serverUrl: '<MoonBox backend>',
      serverPort: ''
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

  fetchMsg(provider: string, username: string, page: number = 1, limit: number = 21) {
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
            return from(
              new Promise(resolve => {
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
  promptGApiAuth(config: any, provider: string, username: string, page: number = 1, limit: number = 21) {
    /*Return messages*/
    return new Promise<any>((resolve, reject) => {
      (async () => {
        await this.rejectLastApiAuth();
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
}

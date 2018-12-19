// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { pluck, share, shareReplay, tap } from 'rxjs/operators';
import { forkJoin, of, interval } from 'rxjs';
import { environment } from '@env/environment';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { NotificationsService } from 'angular2-notifications';
import { extract } from '@app/core';
import { I18nService } from '@app/core';
import { FormType as LoginFormType } from '@moon-box/components/box-reader/login-form.model';
import * as moment from 'moment';

export type ProviderID = 'OVH' | 'GoDaddy' | 'LWS' | 'YopMail' | 'Yahoo' | 'Unknown';

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
    }
  };

  constructor(
    private http: HttpClient,
    private storage: LocalStorage,
    private i18nService: I18nService,
    private notif: NotificationsService
  ) {
    this.generateApiUsername();
  }

  generateApiUsername() {
    this.apiUsername =
      moment().format('YYYYMMDDHHmmss') +
      (Math.random().toString(36) + '12121212121212').slice(2, 14) +
      '@moon-box.monwoo.com';
  }

  logout() {
    this.generateApiUsername(); // Switching current api username, in case logout call to server did fail to reach...
    return this.http.get(this.apiBaseUrl + 'api/moon-box/logout', {
      ...httpOptions,
      ...{
        params: new HttpParams()
        // .set('ctx', ctx)
      }
    });
  }

  login(loginData: LoginFormType) {
    if (loginData.selectedProvider === 'Unknown') {
      this.i18nService.get(extract('mb.backend.connector.unknown')).subscribe(t => {
        this.notif.warn('Backend', t, {
          timeOut: 6000
        });
      });

      throw new Error("Can't login with Unknown provider");
    }

    return (
      this.http
        .post<any>(
          this.apiBaseUrl + 'api/login',
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
                  console.log('Access token saved');
                })
              )
              .subscribe();
          }),
          shareReplay()
        )
    );
  }

  fetchMsg(username: string, page: number = 1, limit: number = 42) {
    return this.http.get(this.apiBaseUrl + 'api/moon-box/data_imap/submit_refresh', {
      ...httpOptions,
      ...{
        params: new HttpParams()
          // .set('ctx', JSON.stringify(ctx))
          .set('limit', limit.toString())
          .set('page', page.toString())
          .set('username', username) // TODO : may be better to submit by post ?
      }
    });

    // return forkJoin(
    //   this.http.post(this.apiBaseUrl + 'api/login', ctx.auth, httpPostOptions).pipe(
    //     tap(loginStatus => {
    //       console.log(loginStatus);
    //     })
    //   ),
    //   this.http.get(this.apiBaseUrl + 'api/messages')
    // );
  }
}

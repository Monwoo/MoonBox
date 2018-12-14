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

export class User {
  _username: string;
  _password: string;
  selectedProvider: string;
  params: any;
}

export type ProviderID = 'OVH' | 'GoDaddy' | 'LWS' | 'Unknown';

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
  public providers = {
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
    }
  };

  constructor(
    private http: HttpClient,
    private storage: LocalStorage,
    private i18nService: I18nService,
    private notif: NotificationsService
  ) {}

  login(_username: string, _password: string, selectedProvider: ProviderID = 'Unknown') {
    if (selectedProvider === 'Unknown') {
      this.i18nService.get(extract('mb.backend.connector.unknown')).subscribe(t => {
        this.notif.warn('Backend', t, {
          timeOut: 6000
        });
      });

      return null;
    }

    let params = {
      mailhost: this.providers[selectedProvider].serverUrl,
      mailport: this.providers[selectedProvider].serverPort,
      moonBoxEmailsGrouping: {
        'aaa@yopmail.com': 'xxa@yopmail.com',
        'xxx@yopmail.com': 'xxa@yopmail.com'
      }
    };
    return (
      this.http
        .post<any>(this.apiBaseUrl + 'api/login', <User>{ _username, _password, selectedProvider, params }, httpOptions)
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

  fetchMsg(ctx: any) {
    return this.http.get(this.apiBaseUrl + 'api/moon-box/data_imap/submit_refresh', {
      ...httpOptions,
      ...{
        params: new HttpParams()
          .set('ctx', JSON.stringify(ctx))
          .set('limit', '10')
          .set('page', '1')
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

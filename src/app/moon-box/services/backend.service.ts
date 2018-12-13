// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { pluck, share, shareReplay, tap } from 'rxjs/operators';
import { forkJoin, of, interval } from 'rxjs';
import { environment } from '@env/environment';
import { LocalStorage } from '@ngx-pwa/local-storage';

export class User {
  _username: string;
  _password: string;
  connector: string;
}

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

  constructor(private http: HttpClient, private storage: LocalStorage) {}

  login(_username: string, _password: string, connector: 'IMAP' | 'Unknown' = 'Unknown') {
    return (
      this.http
        .post<any>(this.apiBaseUrl + 'api/login', <User>{ _username, _password, connector }, httpOptions)
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
    return this.http.get(this.apiBaseUrl + 'api/messages', {
      ...httpOptions,
      ...{
        params: new HttpParams().set('ctx', JSON.stringify(ctx))
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

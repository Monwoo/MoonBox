// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';
import { pluck, share, shareReplay, tap } from 'rxjs/operators';
import { forkJoin, of, interval } from 'rxjs';

export class User {
  email: string;
  password: string;
}

const httpPostOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
    // JWT injected => 'Authorization': 'my-auth-token'
  })
};

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return (
      this.http
        .post<User>('/api/login', { email, password })
        // this is just the HTTP call,
        // we still need to handle the reception of the token
        .pipe(shareReplay())
    );
  }

  fetchMsg(ctx: any) {
    return forkJoin(
      this.http.post('http://localhost:6901/api/login', ctx, httpPostOptions).pipe(
        tap(loginStatus => {
          console.log(loginStatus);
        })
      ),
      this.http.get('http://localhost:6901/api/messages')
    );
  }
}

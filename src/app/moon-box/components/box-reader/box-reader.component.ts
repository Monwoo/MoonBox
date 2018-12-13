import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpHeaders } from '@angular/common/http';

const httpPostOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
    // JWT injected => 'Authorization': 'my-auth-token'
  })
};

@Component({
  selector: 'moon-box-reader',
  templateUrl: './box-reader.component.html',
  styleUrls: ['./box-reader.component.scss']
})
export class BoxReaderComponent implements OnInit {
  imapProviders = {
    OVH: {
      name: 'O.V.H.',
      serverUrl: 'SSL0.OVH.NET',
      serverPort: '993'
    },
    GoDaddy: {
      name: 'GoDaddy',
      serverUrl: 'imap.secureserver.net',
      serverPort: '993'
    },
    LWS: {
      name: 'L.W.S.',
      serverUrl: 'mail07.lwspanel.com',
      serverPort: '993'
    }
  };
  defaultProvider = 'GoDaddy';
  imapClient: any = null;

  constructor(public http: HttpClient) {}

  errorHandler(err: any) {
    console.error(err);
  }

  ngOnInit() {
    const imapProvider = this.imapProviders[this.defaultProvider];
    const ctx = {
      auth: {
        user: 'testuser',
        pass: 'testpass'
      }
    };
    this.http.post('http://localhost:6901/api/login', ctx, httpPostOptions).subscribe(loginStatus => {
      console.log(loginStatus);
      this.http.get('http://localhost:6901/api/messages').subscribe(messages => {
        console.log(messages);
      }, this.errorHandler);
    }, this.errorHandler);
  }
}

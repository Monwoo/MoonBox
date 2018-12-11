import { Component, OnInit } from '@angular/core';
// declare module 'emailjs-imap-client/*'{
//   var _a: any;
//   export = _a;
// }
// import ImapClient from 'emailjs-imap-client';
// import ImapClient from 'emailjs-imap-client/src/client.js';
// No types availables yet, using webpack require ways :

// declare const ImapClient: any;
declare const require: any; // To avoid typeScript error about require that don't exist since it's webpack level
// const ImapClient:any = require('emailjs-imap-client/dist/client.js');
// const ImapClient: any = require('imports-loader?define=>false!emailjs-imap-client');
const ImapClient: any = require('imports-loader?define=>false!emailjs-imap-client/src/client.js');

@Component({
  selector: 'app-box-reader',
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

  constructor() {
    const imapProvider = this.imapProviders[this.defaultProvider];
    const ctx = {
      auth: {
        user: 'testuser',
        pass: 'testpass'
      }
    };

    this.imapClient = new ImapClient(imapProvider.serverUrl, imapProvider.serverPort, ctx);
    this.imapClient.onerror = function(error: any) {
      console.error(error);
    };
    this.imapClient.onerror = function(error: any) {
      console.error(error);
    };
    this.imapClient.connect().then(() => {
      console.log('Connected with context : ', ctx);
      this.imapClient.listMailboxes().then((mailboxes: any) => {
        console.log('Having mailboxes : ', mailboxes);

        this.imapClient.logout().then(() => {
          /* connection terminated for Imap service */
          console.log('Logging out of : ', ctx);
          this.imapClient.close().then(() => {
            /* connection terminated */
            console.log('Closing connexions for : ', ctx);
          });
        });
      });
    });
  }

  ngOnInit() {}
}

// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Component, OnInit } from '@angular/core';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { BackendService } from '@moon-box/services/backend.service';

@Component({
  selector: 'moon-box-reader',
  templateUrl: './box-reader.component.html',
  styleUrls: ['./box-reader.component.scss']
})
export class BoxReaderComponent implements OnInit {
  form: FormGroup;

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

  constructor(private fb: FormBuilder, private backend: BackendService) {
    // TODO : translate ?
    this.form = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  errorHandler(err: any) {
    console.error(err);
  }

  ngOnInit() {
    const imapProvider = this.imapProviders[this.defaultProvider];
    const ctx = {};

    this.backend.fetchMsg(ctx).subscribe((messages: any) => {
      console.log(messages);
    }, this.errorHandler);
  }

  login() {
    const val = this.form.value;

    if (val.email && val.password) {
      this.backend.login(val.email, val.password).subscribe(() => {
        console.log('User is logged in');

        const ctx = {};

        this.backend.fetchMsg(ctx).subscribe((messages: any) => {
          console.log(messages);
        }, this.errorHandler);

        // this.router.navigateByUrl('/');
      });
    }
  }
}

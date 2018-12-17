// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Component, OnInit } from '@angular/core';
// import { extract } from '../../../core/i18n.service';
import { extract } from '@app/core';
import { Router } from '@angular/router';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';

@Component({
  selector: 'moon-box-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  // TODO : from centralized config or realtime data storage ?
  appTitle = extract('Moon Box');

  constructor(private router: Router, private storage: SecuStorageService) {}

  ngOnInit() {}

  goToParameters(e: any) {
    this.router.navigate(['param']);
    // TODO : param page + link to it...
  }

  lockScreen(e: any) {
    this.storage.showLockScreen();
  }
}

// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Component, OnInit } from '@angular/core';
import { extract } from '@app/core';
import { environment } from '@env/environment';

@Component({
  selector: 'moon-box-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  version: string = environment.version;
  trans = {
    copyright: {
      text: extract('© Copyright Monwoo 2018, service@monwoo.com, données privées'),
      url: extract('https://www.monwoo.com')
    }
  };

  constructor() {}

  ngOnInit() {}
}

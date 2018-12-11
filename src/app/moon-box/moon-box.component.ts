// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com
import { Component, OnInit } from '@angular/core';
import { LoadingLoaderService } from '@moon-manager/services/loading-loader.service';

@Component({
  selector: 'monwoo-moon-box',
  templateUrl: './moon-box.component.html',
  styleUrls: ['./moon-box.component.scss']
})
export class MoonBoxComponent implements OnInit {
  constructor(private ll: LoadingLoaderService) {
    ll.hideLoader();
  }

  ngOnInit() {}
}

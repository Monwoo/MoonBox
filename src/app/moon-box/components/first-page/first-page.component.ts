// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com
import { Component, OnInit } from '@angular/core';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';

@Component({
  selector: 'app-first-page',
  templateUrl: './first-page.component.html',
  styleUrls: ['./first-page.component.scss']
})
export class FirstPageComponent implements OnInit {
  constructor(public storage: SecuStorageService) {}

  ngOnInit() {}
}

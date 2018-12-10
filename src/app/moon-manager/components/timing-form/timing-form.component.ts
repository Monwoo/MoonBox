// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Component, OnInit, Input } from '@angular/core';
import { Timing } from '../../api/data-model/timing';

@Component({
  selector: 'moon-manager-timing-form',
  templateUrl: './timing-form.component.html',
  styleUrls: ['./timing-form.component.scss']
})
export class TimingFormComponent implements OnInit {
  @Input() t: Timing;
  constructor() {}

  ngOnInit() {}
}

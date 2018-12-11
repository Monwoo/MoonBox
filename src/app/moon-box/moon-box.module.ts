// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoonBoxRoutingModule } from './moon-box-routing.module';
import { MonwooMoonManagerWrapModule } from '@moon-manager/monwoo-moon-manager-wrap.module';
import { MonwooMoonBoxWrapModule } from '@moon-box/monwoo-moon-box-wrap.module';

@NgModule({
  declarations: [],
  imports: [CommonModule, MoonBoxRoutingModule, MonwooMoonManagerWrapModule, MonwooMoonBoxWrapModule]
})
export class MoonBoxModule {}

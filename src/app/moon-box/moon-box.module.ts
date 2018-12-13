// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoonBoxRoutingModule } from './moon-box-routing.module';
import { MonwooMoonManagerWrapModule } from '@moon-manager/monwoo-moon-manager-wrap.module';
import { MonwooMoonBoxWrapModule } from '@moon-box/monwoo-moon-box-wrap.module';
import { BoxReaderComponent } from './components/box-reader/box-reader.component';
import { ParametersComponent } from './components/parameters/parameters.component';
import { BoxesComponent } from './components/boxes/boxes.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // <== add the imports!

@NgModule({
  declarations: [BoxReaderComponent, ParametersComponent, BoxesComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MoonBoxRoutingModule,
    MonwooMoonManagerWrapModule,
    MonwooMoonBoxWrapModule
  ]
})
export class MoonBoxModule {}

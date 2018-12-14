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
import { TranslateModule } from '@ngx-translate/core';

import { CalendarModule, DateAdapter } from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCardModule } from '@angular/material';

import { DynamicFormsCoreModule } from '@ng-dynamic-forms/core';
import { DynamicFormsMaterialUIModule } from '@ng-dynamic-forms/ui-material';
import { ShowHidePasswordModule } from 'ngx-show-hide-password';

@NgModule({
  declarations: [BoxReaderComponent, ParametersComponent, BoxesComponent],
  imports: [
    CommonModule,
    TranslateModule,
    MoonBoxRoutingModule,
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory
    }),
    ShowHidePasswordModule.forRoot(),
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatGridListModule,
    MatExpansionModule,
    DynamicFormsCoreModule,
    DynamicFormsMaterialUIModule,

    MonwooMoonManagerWrapModule,
    MonwooMoonBoxWrapModule
  ]
})
export class MoonBoxModule {}

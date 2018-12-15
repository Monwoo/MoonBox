// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoonBoxRoutingModule } from './moon-box-routing.module';
import { MonwooMoonManagerWrapModule } from '@moon-manager/monwoo-moon-manager-wrap.module';
import { MonwooMoonBoxWrapModule } from '@moon-box/monwoo-moon-box-wrap.module';
import { BoxReaderComponent } from './components/box-reader/box-reader.component';
import { ParametersComponent } from './components/parameters/parameters.component';
import { BoxesComponent } from './components/boxes/boxes.component';
import { ReactiveFormsModule, FormsModule, NG_VALIDATORS, NG_ASYNC_VALIDATORS } from '@angular/forms';
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
import { MAT_CHIPS_DEFAULT_OPTIONS, MatCardModule, MatNativeDateModule } from '@angular/material';

import { DYNAMIC_VALIDATORS, DynamicFormsCoreModule, Validator, ValidatorFactory } from '@ng-dynamic-forms/core';
import { DynamicFormsMaterialUIModule } from '@ng-dynamic-forms/ui-material';
import { ShowHidePasswordModule } from 'ngx-show-hide-password';
import {
  customValidator,
  customDateRangeValidator,
  customForbiddenValidator,
  customAsyncFormGroupValidator
} from './moon-box.validators';
import { SafeHtmlPipe } from './pipes/safe-html.pipe';

@NgModule({
  declarations: [BoxReaderComponent, ParametersComponent, BoxesComponent, SafeHtmlPipe],
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
    MatNativeDateModule,
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
  ],
  providers: [
    {
      provide: NG_VALIDATORS,
      useValue: customValidator,
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useValue: customDateRangeValidator,
      multi: true
    },
    {
      provide: NG_ASYNC_VALIDATORS,
      useValue: customAsyncFormGroupValidator,
      multi: true
    },
    {
      provide: DYNAMIC_VALIDATORS,
      useValue: new Map<string, Validator | ValidatorFactory>([
        ['customValidator', customValidator],
        ['customDateRangeValidator', customDateRangeValidator],
        ['customForbiddenValidator', customForbiddenValidator],
        ['customAsyncFormGroupValidator', customAsyncFormGroupValidator]
      ])
    },
    {
      provide: MAT_CHIPS_DEFAULT_OPTIONS,
      useValue: {
        separatorKeyCodes: [13, 188]
      }
    }
  ]
})
export class MoonBoxModule {}

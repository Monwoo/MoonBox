// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule, NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';

import { FormsModule, ReactiveFormsModule } from '@angular/forms'; // <== add the imports!
// import { MatButtonModule, MatCheckboxModule, MatTooltipModule } from '@angular/material';
import { ScrollingModule } from '@angular/cdk/scrolling';
// import { ScrollingModule as ExperimentalScrollingModule } from '@angular/cdk-experimental/scrolling';
import { PlatformModule } from '@angular/cdk/platform';
import { MatCardModule } from '@angular/material';

// TODO : try to integrate nice logger module... or find starter ways...
// import { Logger, Options as LogOpt, Level as LogLvl } from 'angular2-logger/dist/es6/core';
import { CurrencyPipe } from '@angular/common';
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

import { DynamicFormsCoreModule } from '@ng-dynamic-forms/core';
import { DynamicFormsMaterialUIModule } from '@ng-dynamic-forms/ui-material';

// TODO : try to combine Material and PrimeNg, failing import about splitbutton for now...
import { SplitButtonModule } from 'primeng/splitbutton';

import { TreeTableModule } from 'primeng/treetable';
import { PanelModule } from 'primeng/panel';
import { ClipboardModule } from 'ngx-clipboard';
import { StoreModule } from '@ngrx/store';
import { timingsReducer } from './services/timings-buffer.service';
import { mediasReducer } from './services/medias-buffer.service';
import { metaReducers } from './services/meta-reducers';

import { MoonManagerRoutingModule } from './moon-manager-routing.module';
import { BodyComponent } from './components/body/body.component';
import { ClientFilesLoaderComponent } from './components/client-files-loader/client-files-loader.component';
import { TimingFormComponent } from './components/timing-form/timing-form.component';
import { TimingPivotComponent } from './components/timing-pivot/timing-pivot.component';

// https://github.com/zefoy/ngx-dropzone-wrapper
import { DropzoneModule } from 'ngx-dropzone-wrapper';
import { DROPZONE_CONFIG } from 'ngx-dropzone-wrapper';
import { DropzoneConfigInterface } from 'ngx-dropzone-wrapper';
import { ParametersComponent } from './components/parameters/parameters.component';
import { MonwooMoonManagerWrapModule } from './monwoo-moon-manager-wrap.module';
import { DefaultPipe } from './pipes/default.pipe';
import { UrlTransformerPipe } from './pipes/url-transformer.pipe';
import { TimelineYearlyPlanComponent } from './components/timeline-yearly-plan/timeline-yearly-plan.component';
import { NgLetDirective } from './directives/ng-let.directive';
import { FlexLayoutModule } from '@angular/flex-layout';
import { PapaParseModule } from 'ngx-papaparse';
import { HasTypePipe } from './pipes/has-type.pipe';
// import { FormioModule } from 'angular-formio';
// import { AframePipeModule } from 'angular-aframe-pipe/aframe-pipe.module';
import { AFrameTutorialComponent } from './components/aframe-tutorial/aframe-tutorial.component';

const DEFAULT_DROPZONE_CONFIG: DropzoneConfigInterface = {
  // maxFilesize: 50000,
  acceptedFiles: null
};

@NgModule({
  declarations: [
    BodyComponent,
    ClientFilesLoaderComponent,
    TimingFormComponent,
    TimingPivotComponent,
    ParametersComponent,
    DefaultPipe,
    UrlTransformerPipe,
    TimelineYearlyPlanComponent,
    NgLetDirective,
    HasTypePipe,
    // AframePipeModule,
    AFrameTutorialComponent
  ],
  imports: [
    CommonModule,
    BrowserAnimationsModule,
    TranslateModule,
    StoreModule.forRoot(
      {
        timings: timingsReducer,
        medias: mediasReducer
      },
      { metaReducers }
    ),
    // NoopAnimationsModule,
    MoonManagerRoutingModule,
    PapaParseModule,
    DropzoneModule,
    CalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory
    }),
    HttpClientModule,
    FlexLayoutModule,
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
    ClipboardModule,
    DynamicFormsCoreModule,
    DynamicFormsMaterialUIModule,
    ScrollingModule,
    // ExperimentalScrollingModule,
    PlatformModule,
    TreeTableModule,
    SplitButtonModule,
    PanelModule,
    // FormioModule,
    MonwooMoonManagerWrapModule
  ],
  exports: [NgLetDirective],
  providers: [
    // { provide: LogOpt, useValue: { level: LogLvl.DEBUG } },
    // Logger,
    CurrencyPipe,
    {
      provide: DROPZONE_CONFIG,
      useValue: DEFAULT_DROPZONE_CONFIG
    }
  ]
})
export class MoonManagerModule {}

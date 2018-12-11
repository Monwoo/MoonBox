import { BrowserModule } from '@angular/platform-browser';
import { NgModule, TRANSLATIONS_FORMAT, TRANSLATIONS } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ServiceWorkerModule } from '@angular/service-worker';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { environment } from '@env/environment';
import { CoreModule, I18nService } from '@app/core';
import { SharedModule } from '@app/shared';
import { MoonManagerModule } from './moon-manager/moon-manager.module';
import { HomeModule } from './home/home.module';
import { ShellModule } from './shell/shell.module';
import { AboutModule } from './about/about.module';
import { LoginModule } from './login/login.module';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
// import { I18n, MISSING_TRANSLATION_STRATEGY } from '@ngx-translate/i18n-polyfill';
import { HttpModule, Http } from '@angular/http';
import { TranslateLoader } from '@ngx-translate/core';
import { I18n } from '@ngx-translate/i18n-polyfill';
// import { webp } from 'webp-hero/dist/webp-hero';
@NgModule({
  imports: [
    BrowserModule,
    ServiceWorkerModule.register('./ngsw-worker.js', { enabled: environment.production }),
    FormsModule,
    HttpClientModule,
    // TODO : move translation deps loadings to shared module ?
    HttpModule,
    TranslateModule
      .forRoot
      // {
      //   loader: {
      //     provide: TranslateLoader,
      //     useFactory: createTranslateLoader,
      //     deps: [Http]
      //   }
      // }
      (),
    NgbModule,
    CoreModule,
    SharedModule,
    ShellModule,
    MoonManagerModule,
    HomeModule,
    AboutModule,
    LoginModule,
    AppRoutingModule // must be imported as the last module as it contains the fallback route
  ],
  declarations: [AppComponent],
  providers: [
    // TODO : refactor to shared module or Core module ?
    // https://github.com/ngx-translate/i18n-polyfill/issues/4
    // format of translations that you use
    // { provide: TRANSLATIONS_FORMAT, useValue: 'xlf' },
    // // the translations that you need to load on your own
    // {provide: TRANSLATIONS, useValue: XLIFF},
    // // locale id that you're using (default en-US)
    // {provide: LOCALE_ID, useValue: "fr"},
    // // optional, defines how error will be handled
    // {provide: MISSING_TRANSLATION_STRATEGY, useValue: MissingTranslationStrategy.Error},
    // {
    //   provide: TRANSLATIONS,
    //   useFactory: createWebpackTranslateLoader,
    //   deps: [I18nService]
    // },
    // {
    //   provide: TRANSLATIONS,
    //   useFactory: createTranslateLoader,
    //   deps: [Http]
    // },
    // {
    //   provide: TranslateLoader,
    //   useFactory: createTranslateLoader,
    //   deps: [Http]
    // },
    // I18n
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}

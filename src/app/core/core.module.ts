import { NgModule, Optional, SkipSelf, TRANSLATIONS } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClient, HttpClientModule } from '@angular/common/http';
import { RouteReuseStrategy, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { RouteReusableStrategy } from './route-reusable-strategy';
import { AuthenticationService } from './authentication/authentication.service';
import { AuthenticationGuard } from './authentication/authentication.guard';
// TODO : will need refactoring, should stay in MoonManager module and only overwrite access PER ROUTES :
import { RoutingSentinelService } from '../moon-manager/services/routing-sentinel.service';
import { I18nService } from './i18n.service';
import { HttpService } from './http/http.service';
import { HttpCacheService } from './http/http-cache.service';
import { ApiPrefixInterceptor } from './http/api-prefix.interceptor';
import { ErrorHandlerInterceptor } from './http/error-handler.interceptor';
import { CacheInterceptor } from './http/cache.interceptor';
import { I18n, MISSING_TRANSLATION_STRATEGY } from '@ngx-translate/i18n-polyfill';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpModule, Http } from '@angular/http';
import { TranslateLoader } from '@ngx-translate/core';
import { tap } from 'rxjs/operators';

import { Logger } from '@app/core/logger.service';

import { JwtModule, JwtModuleOptions, JWT_OPTIONS } from '@auth0/angular-jwt';
// import { Storage } from '@ionic/storage';
// import { TokenService } from './app.tokenservice';
import { LocalStorage } from '@ngx-pwa/local-storage';

// https://github.com/auth0/angular2-jwt
// export function jwtOptionsFactory(storage) {
export function jwtOptionsFactory(storage: LocalStorage) {
  return {
    tokenGetter: () => {
      return storage
        .getItem<any>('access_token')
        .pipe(
          tap((token: any) => {
            console.log('Token :', token);
          })
        )
        .toPromise();
    },
    whitelistedDomains: ['localhost:6901', '127.0.0.1:6901', '[::1]:6901', 'monwoo.com', 'monwoo.fr']
    //deps: [TokenService]
    // whitelistedDomains: ['example.com'],
    // blacklistedRoutes: ['example.com/examplebadroute/'],
  };
}

// TODO : refactor and bundle in MonwooLogger module ?
// -> quick switch between review / debug mode
// + better stack trace (colors + humanly meanfull + machin plugable...)
// import { Logger } from './logger.service';
const MonwooReview = new Logger('MonwooReview');

// export function createTranslateLoader(i18nService: I18nService) {
//   return i18nService.translations;
// }

export function createTranslateLoader(http: HttpClient) {
  // src/assets/translations/messages.en.xlf
  // return new TranslateHttpLoader(http, './assets/i18n/', '.json');
  // TODO : ERROR TypeError: this._input.charCodeAt is not a function in tokenizer
  // => because fail to load file or other reason ?
  MonwooReview.warn('Fail to load file ?');
  return new TranslateHttpLoader(http, './assets/translations/messages.', '.xlf');
}

declare const require: any; // To avoid typeScript error about require that don't exist since it's webpack level
const i18nLanguages = {
  // TODO : auto gen from environnement config
  // 'fr-FR': require(`raw-loader!../../assets/translations/messages.fr-FR.xlf`),
  // 'en-US': require(`raw-loader!../../assets/translations/messages.en-US.xlf`)
};

export function createWebpackTranslateLoader(i18nService: I18nService) {
  return i18nLanguages[i18nService.language];
}

@NgModule({
  imports: [
    CommonModule,
    HttpClientModule,
    JwtModule.forRoot({
      jwtOptionsProvider: {
        provide: JWT_OPTIONS,
        useFactory: jwtOptionsFactory,
        deps: [LocalStorage]
      }
    }),
    // TODO refactor : move to Shard module ?
    // https://angular.io/docs/ts/latest/guide/ngmodule.html#!#shared-modules
    // TranslateModule.forRoot({
    //   loader: {
    //     // provide: TranslateLoader,
    //     // useFactory: (i18nService:I18nService) => {
    //     //   return i18nService.translations;
    //     // },
    //     // deps: [I18nService],

    //     // provide: TranslateLoader,
    //     // useFactory: (createTranslateLoader),
    //     // deps: [I18nService],

    //     provide: TranslateLoader,
    //     useFactory: (createTranslateLoader),
    //     deps: [Http],
    //   }
    // }),
    TranslateModule,
    RouterModule
  ],
  exports: [TranslateModule],
  providers: [
    AuthenticationService,
    RoutingSentinelService, // AuthenticationGuard,
    I18nService,
    // https://github.com/ngx-translate/i18n-polyfill#extraction
    // {provide: TRANSLATIONS, useValue: translations},
    // https://github.com/ngx-translate/i18n-polyfill/issues/4
    // {provide: MISSING_TRANSLATION_STRATEGY, useValue: MissingTranslationStrategy.Ignore},
    // https://github.com/ngx-translate/core/blob/master/projects/ngx-translate/core/src/lib/translate.service.ts
    // {
    //   provide: TRANSLATIONS,
    //   useFactory: (translateService:TranslateService) => {
    //     return translateService.translations();
    //   },
    //   deps: [TranslateService]
    // },
    // {
    //   provide: TranslateLoader,
    //   useFactory: createTranslateLoader,
    //   deps: [Http]
    // },
    // I18n,

    HttpCacheService,
    ApiPrefixInterceptor,
    ErrorHandlerInterceptor,
    CacheInterceptor,
    {
      provide: HttpClient,
      useClass: HttpService
    },
    {
      provide: RouteReuseStrategy,
      useClass: RouteReusableStrategy
    }
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    // Import guard
    if (parentModule) {
      throw new Error(`${parentModule} has already been loaded. Import Core module in the AppModule only.`);
    }
  }
}

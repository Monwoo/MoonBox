import { Component, OnInit } from '@angular/core';
import { I18nService } from '@app/core';
import { extract } from '@app/core';
import { NotificationsService } from 'angular2-notifications';
import { LoadingLoaderService } from '@moon-manager/services/loading-loader.service';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';
import { LocalStorage } from '@ngx-pwa/local-storage';

@Component({
  selector: 'app-parameters',
  templateUrl: './parameters.component.html',
  styleUrls: ['./parameters.component.scss']
})
export class ParametersComponent implements OnInit {
  langPlaceholder: string = extract('Langue');
  passCode: string;
  constructor(
    private i18nService: I18nService,
    private notif: NotificationsService,
    private ll: LoadingLoaderService,
    public storage: SecuStorageService,
    private localStorage: LocalStorage
  ) {}

  ngOnInit() {}
  // https://angular.io/guide/lifecycle-hooks
  ngAfterViewChecked() {
    this.storage.dismissLockScreenForPreventScreen();
  }

  errorHandler = (error: any) => {
    console.log(error);
    this.i18nService
      .get(extract('mm.param.notif.errorHasOccured'), {
        errMsg: error.message
      })
      .subscribe(t => {
        this.notif.error(t);
        this.ll.hideLoader();
      });
  };

  resetConfigAction(e: any) {
    // this.ll.showLoader();
    // // let changes = this.paramsForm.form.value;
    (async () => {
      this.localStorage.clear().subscribe(() => {
        this.i18nService.get(extract('mm.param.notif.cleaningParametersOk')).subscribe(t => {
          this.notif.success(t);
          this.ll.hideLoader();
        });
      }, this.errorHandler);
    })();
    // TODO : reset secuStorage + ask for jwt server side token wipeout...
  }

  setLanguage(language: string) {
    this.ll.showLoader();
    this.i18nService.language = language;
    this.i18nService.get(language).subscribe(langT => {
      this.i18nService
        .get(extract('mm.param.notif.languageChange'), {
          lang: langT
        })
        .subscribe(t => {
          this.notif.success(t);
          this.ll.hideLoader();
        });
    });
  }

  get currentLanguage(): string {
    return this.i18nService.language;
  }

  get languages(): string[] {
    return this.i18nService.supportedLanguages;
  }

  setSecurityCode(e: any) {
    this.storage.setPassCode(this.passCode);
  }

  lockScreen() {
    this.storage.showLockScreen(false);
  }
}

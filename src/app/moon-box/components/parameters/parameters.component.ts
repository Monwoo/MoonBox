// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Component, OnInit } from '@angular/core';
import { I18nService } from '@app/core';
import { extract } from '@app/core';
import { NotificationsService } from 'angular2-notifications';
import { LoadingLoaderService } from '@moon-manager/services/loading-loader.service';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { Logger } from '@app/core/logger.service';
import * as moment from 'moment';

const logReview = new Logger('MonwooReview');

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
  dropzoneBckp = {
    url: '#', // Url set to avoid console Error, but will not be used in V1.0.0
    autoProcessQueue: false, // We will no upload to server, only local processings for V1.0.0
    autoQueue: false,
    clickable: true,
    acceptedFiles: '.bckp',
    accept: (f: any, isValidTrigger: any) => {
      this.processingBckpImport(f);
      isValidTrigger();
    }
  };

  ngOnInit() {}
  // https://angular.io/guide/lifecycle-hooks
  ngAfterViewChecked() {
    this.storage.dismissLockScreenForPreventScreen();
  }

  processingBckpImport(f: File) {
    const fileName = f.name;
    const reader: FileReader = new FileReader();
    reader.onload = e => {
      const dataStr: string = <string>reader.result;
      let importCount = 0;
      let importLength = 0;
      {
        // JSON Import
        const jsonData = JSON.parse(dataStr);
        importLength = jsonData.length;

        if (
          !jsonData.hasOwnProperty('_secure__ls__metadata') ||
          !jsonData.hasOwnProperty('boxesIdxs') ||
          !jsonData.hasOwnProperty('moon-box-filters') ||
          !jsonData.hasOwnProperty('boxes') ||
          !jsonData.hasOwnProperty('cS') ||
          !jsonData.hasOwnProperty('eS') ||
          !jsonData.hasOwnProperty('pC') ||
          !jsonData.hasOwnProperty('language')
        ) {
          this.i18nService.get(extract('Fail to import backup file : BAD Format...')).subscribe(t => {
            // logReview.warn(t);
            this.notif.warn(t);
          });
          logReview.warn('Bad backup format : ', jsonData);
          return;
        }

        (async () => {
          const setItem = (idx: string, value: any) => {
            if (value) {
              localStorage.setItem(idx, value);
            } else {
              localStorage.removeItem(idx);
            }
          };
          setItem('_secure__ls__metadata', jsonData._secure__ls__metadata);
          setItem('boxesIdxs', jsonData.boxesIdxs);
          setItem('moon-box-filters', jsonData['moon-box-filters']);
          for (let i = 0; i < jsonData.boxes.length; i++) {
            const b = jsonData.boxes[i];
            setItem('moon-box-' + b.id, b.data);
          }
          setItem('cS', jsonData.cS);
          setItem('eS', jsonData.eS);
          setItem('pC', jsonData.pC);
          setItem('language', jsonData.language);

          this.i18nService
            .get(extract('Succed to import {{file}}'), {
              file: fileName
            })
            .subscribe(t => {
              logReview.debug(t);
              this.notif.success(t);
            });
        })();
      }
    };
    reader.onabort = (ev: ProgressEvent) => {
      logReview.debug('Aborting : ', f);
    };
    reader.onerror = (ev: ProgressEvent) => {
      logReview.error('Error for : ', f);
    };
    reader.readAsText(f);
  }

  processingBckpExport() {
    const exportData = (src: any) => {
      const str = JSON.stringify(src);
      const blob = new Blob([str], { type: 'text/json' });
      const url = window.URL.createObjectURL(blob);
      const element = document.createElement('a');
      const prefix = 'moon-box-';
      element.href = url;
      element.download = prefix + moment().format('YYYYMMDDHHmmss') + '.bckp';
      document.body.appendChild(element);
      element.click();
      this.i18nService
        .get(extract('mm.param.notif.exportSucced'), {
          dest: element.download
        })
        .subscribe(t => {
          this.notif.success(t);
        });
    };
    (async () => {
      let bckp = {};
      // bckp['_secure__ls__metadata'] = await this.localStorage.getItem('_secure__ls__metadata').toPromise();
      bckp['_secure__ls__metadata'] = localStorage.getItem('_secure__ls__metadata');
      bckp['boxesIdxs'] = localStorage.getItem('boxesIdxs');
      bckp['moon-box-filters'] = localStorage.getItem('moon-box-filters');
      bckp['boxes'] = localStorage.getItem('boxes');
      bckp['cS'] = localStorage.getItem('cS');
      bckp['eS'] = localStorage.getItem('eS');
      bckp['pC'] = localStorage.getItem('pC');
      bckp['language'] = localStorage.getItem('language');
      bckp['boxes'] = [];
      const boxesIdxs = await this.storage.getItem<string[]>('boxesIdxs').toPromise();
      for (let i = 0; i < boxesIdxs.length; i++) {
        const b = boxesIdxs[i];
        bckp['boxes'].push({
          id: b,
          data: localStorage.getItem('moon-box-' + b)
        });
      }
      exportData(bckp);
    })();
  }

  onUploadBckpError(e: any) {
    logReview.debug('Upload bckp error has occured', e);
    if (e[1] !== 'Upload canceled.') {
      this.i18nService.get(extract('mb.param.notif.uploadErrorHasOccured')).subscribe(t => {
        this.notif.error(t);
      });
    }
  }

  errorHandler = (error: any) => {
    console.log(error);
    this.i18nService
      .get(extract('mb.param.notif.errorHasOccured'), {
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

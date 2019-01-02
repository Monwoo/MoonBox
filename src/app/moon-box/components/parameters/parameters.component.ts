// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

/*
TODO ? no personal data retain, si ? : traite vos données personnelles (nombre de connexions, pages visitées, publicités cliquées) afin d'établir des statistiques de visite et pour vous fournir des recommandations personnalisées.

Conformément au Règlement Général de Protection des Données du 23 mai 2018 et à la loi n°78-17, vous pouvez exercer vos droits d’accès, de rectification et d’opposition de vos données personnelles à tout moment, en écrivant au service marketing à l’adresse suivante : sav@monwoo.com

En poursuivant votre navigation sur ce site, vous acceptez l’utilisation de cookies. Pour en savoir plus et paramétrer les cookies…
*/

import { Component, OnInit } from '@angular/core';
import { I18nService } from '@app/core';
import { extract } from '@app/core';
import { NotificationsService } from 'angular2-notifications';
import { LoadingLoaderService } from '@moon-manager/services/loading-loader.service';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';
import { ThemingsService } from '@moon-box/services/themings.service';
import { Logger } from '@app/core/logger.service';
import { MessagesService } from '@moon-box/services/messages.service';
import * as moment from 'moment';
import { environment } from '@env/environment';

const logReview = new Logger('MonwooReview');

@Component({
  selector: 'app-parameters',
  templateUrl: './parameters.component.html',
  styleUrls: ['./parameters.component.scss']
})
export class ParametersComponent implements OnInit {
  langPlaceholder: string = extract('Langue');
  passCode: string = '';
  constructor(
    private i18nService: I18nService,
    private notif: NotificationsService,
    private ll: LoadingLoaderService,
    public storage: SecuStorageService,
    public msgs: MessagesService,
    private themings: ThemingsService
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
          !jsonData.hasOwnProperty('lvl2') ||
          !jsonData.hasOwnProperty('language') ||
          !jsonData.hasOwnProperty('current-theme') ||
          !jsonData.hasOwnProperty('moon-box-messages') // TODO : reduce on backupable keys instead of raw code
        ) {
          this.i18nService.get(extract('mb.param.notif.backupCorruptErr')).subscribe(t => {
            // logReview.warn(t);
            this.notif.warn(t);
          });
          logReview.warn('Bad backup format : ', jsonData);
          return;
        }

        (async () => {
          await this.resetToFactory(null);
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
          setItem('lvl2', jsonData.lvl2);
          setItem('language', jsonData.language);
          setItem('current-theme', jsonData['current-theme']);
          setItem('moon-box-messages', jsonData['moon-box-messages']); // TODO : reduce on backupable keys instead of raw code
          // this.storage.checkPassCodeValidity('');
          // this.storage.checkLock();
          this.storage.checkLockScreen();

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
      bckp['lvl2'] = localStorage.getItem('lvl2');
      bckp['current-theme'] = localStorage.getItem('current-theme');
      bckp['language'] = localStorage.getItem('language');
      bckp['current-theme'] = localStorage.getItem('current-theme');
      bckp['moon-box-messages'] = localStorage.getItem('moon-box-messages'); // TODO : reduce on backupable keys instead of raw code

      let dbgData = {};
      if (!environment.production) {
        // Object.keys(bckp).reduce((acc:any, k:string) => {
        //   acc[k] = null;
        //   return acc;
        // }, {});
        const keys = Object.keys(bckp);
        const lvl2Keys: string[] = this.storage.getLvl2Keys();
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (lvl2Keys.includes(key)) {
            dbgData[key] = await this.storage.getItem<string[]>(key, []).toPromise();
          } else {
            dbgData[key] = localStorage.getItem(key);
          }
        }
        dbgData['boxes'] = [];
      }
      bckp['boxes'] = [];
      const boxesIdxs = await this.storage.getItem<string[]>('boxesIdxs', []).toPromise();
      for (let i = 0; i < boxesIdxs.length; i++) {
        const b = boxesIdxs[i];
        bckp['boxes'].push({
          id: b,
          data: localStorage.getItem('moon-box-' + b)
        });
        if (!environment.production) {
          dbgData['boxes'].push({
            id: b,
            data: await this.storage.getItem<string[]>('moon-box-' + b, null).toPromise()
          });
        }
      }
      if (!environment.production) {
        // Redondant ? really safe only if switch ?
        logReview.debug('Backuping data : ', dbgData);
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

  async resetToFactory(e: any) {
    // this.ll.showLoader();
    // // let changes = this.paramsForm.form.value;
    // TODO : reset secuStorage + ask for jwt server side token wipeout...
    // TODO : backend logout ? is logout implemented ?
    this.passCode = '';
    await this.storage.clear();
    this.msgs.clearMessages();
    this.i18nService.get(extract('mm.param.notif.cleaningParametersOk')).subscribe(t => {
      this.notif.success(t);
      // this.ll.hideLoader();
    });
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
    // Can't avoid empty passe code, since it's the only way to remove pass code...
    // if (!this.passCode || '' === this.passCode) {
    //   this.i18nService
    //     .get(extract('mb.param.notif.failForEmptyPassCode'))
    //     .subscribe(t => {
    //       this.notif.error(t);
    //     });
    // } else {
    this.storage.setPassCode(this.passCode);
    // }
  }

  lockScreen() {
    this.storage.showLockScreen(false);
  }
}

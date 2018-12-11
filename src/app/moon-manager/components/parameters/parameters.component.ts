// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import {
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
  NgZone
} from '@angular/core';
import { NgForm, FormGroup } from '@angular/forms';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { NotificationsService } from 'angular2-notifications';
import { extract } from '@app/core';
import { environment } from '@env/environment';
import {
  DynamicFormModel,
  DynamicFormLayout,
  DynamicFormService,
  DynamicFormControlModel,
  DynamicInputModel,
  DynamicFormGroupModel
} from '@ng-dynamic-forms/core';
import { I18nService } from '@app/core';
import { LangChangeEvent } from '@ngx-translate/core';
import * as moment from 'moment';
import { Papa } from 'ngx-papaparse';
import { shallowMerge } from '../../tools';
import { Logger } from '@app/core/logger.service';
import { detect } from 'detect-browser';
import { ClipboardService } from 'ngx-clipboard';

// import { parse as parseJSON, stringify as stringifyJSON } from 'flatted';
// import * as YAML from 'yamljs';
// import { stringify as stringifyYAML, parse as parseYAML } from 'yamljs';
declare var YAML: any;

const MonwooReview = new Logger('MonwooReview');

import { CONFIG_FORM_LAYOUT, configFormModel, getFreshConf } from './config-form.model';
import { MediasBufferService } from '../../services/medias-buffer.service';
import { TimingsBufferService } from '../../services/timings-buffer.service';
import { Timing } from '@app/moon-manager/api/data-model/timing';
import { LoadingLoaderService } from '../../services/loading-loader.service';

@Component({
  selector: 'moon-manager-parameters',
  templateUrl: './parameters.component.html',
  styleUrls: ['./parameters.component.scss']
})
export class ParametersComponent implements OnInit, OnChanges, AfterViewInit {
  @ViewChild('paramsForm') paramsForm: NgForm = null; // TODO : fail to use for now

  // formModel: Promise<DynamicFormModel> = configFormModel(this);
  formModel: DynamicFormModel = null;
  // TODO : how to custom layout for embed form with NO html code ?
  // Need some code pattern to avoid id's clash ?
  formLayout: DynamicFormLayout = CONFIG_FORM_LAYOUT;
  // formGroup: BehaviorSubject<FormGroup> = new BehaviorSubject<FormGroup>(new FormGroup({}));
  formGroup: FormGroup = null;

  langPlaceholder: string = extract('Langue');

  // TODO i18n annotation needed OnDemande... realy nice to have simple system,
  // but with below case, translator will not have easy ways to gess right translation...
  indicatorStoryUrl: string = extract('assets/TimingsIndicatorStory.png');

  exportFmt: string = 'csv';
  exportFmts: string[] = ['csv', 'json', 'yaml'];
  exportTitles = {
    csv: extract('mm.param.export.fmt.csv'),
    json: extract('mm.param.export.fmt.json'),
    yaml: extract('mm.param.export.fmt.yaml')
  };
  timingsProgress: number = 0;
  mediasProgress: number = 0;

  dropzoneMediasConfig = {
    url: '#', // Url set to avoid console Error, but will not be used in V1.0.0
    autoProcessQueue: false, // We will no upload to server, only local processings for V1.0.0
    autoQueue: false,
    clickable: true,
    acceptedFiles: '.json,.yaml,.csv',
    accept: (f: any, isValidTrigger: any) => {
      this.processingImport(f, 'medias');
    }
  };

  dropzoneTimingsConfig = {
    url: '#', // Url set to avoid console Error, but will not be used in V1.0.0
    autoProcessQueue: false, // We will no upload to server, only local processings for V1.0.0
    autoQueue: false,
    clickable: true,
    acceptedFiles: '.json,.yaml,.csv',
    accept: (f: any, isValidTrigger: any) => {
      this.processingImport(f, 'timings');
    }
  };

  public config: any = null;
  private browser: any = null;
  public configWarning: string = '';

  constructor(
    private ll: LoadingLoaderService,
    private ngZone: NgZone,
    private storage: LocalStorage,
    private medias: MediasBufferService,
    private timings: TimingsBufferService,
    private i18nService: I18nService,
    private notif: NotificationsService,
    private formService: DynamicFormService,
    private papaParse: Papa,
    private clipboard: ClipboardService
  ) {
    // // Request Quota (only for File System API)
    // var requestedBytes = 1024*1024*1000; // 10MB
    // // https://developer.chrome.com/apps/offline_storage#asking_more
    // (<any>navigator).webkitPersistentStorage.requestQuota (
    //   requestedBytes, function(grantedBytes:number) {
    //     // window.requestFileSystem(PERSISTENT, grantedBytes, onInitFs, errorHandler);
    //     (<any>window).requestFileSystem(1, grantedBytes);
    //     console.log('we get ', grantedBytes, 'bytes');
    //   }, function(e:any) { console.log('Error', e); }
    // );
    // // https://developer.chrome.com/apps/offline_storage#unlimited
    // (<any>navigator).webkitTemporaryStorage.queryUsageAndQuota (
    //     function(usedBytes:number, grantedBytes:number) {
    //         console.log('we are using ', usedBytes, ' of ', grantedBytes, 'bytes');
    //     },
    //     function(e:any) { console.log('Error', e);  }
    // );
  }

  setExportFmt(fmt: string) {
    this.exportFmt = fmt;
  }

  updateConfigForm() {
    // this.formModel.then(fm => {
    configFormModel(this).then((fm: DynamicFormModel) => {
      // this.formGroup = new BehaviorSubject(this.formService.createFormGroup(fm));
      this.formModel = fm;
      this.formGroup = this.formService.createFormGroup(this.formModel);

      // Load from params from local storage :
      this.storage.getItem<any>('config', {}).subscribe(
        config => {
          (async () => {
            // Called if data is valid or null
            let freshConf = await getFreshConf(this);
            this.config = shallowMerge(1, freshConf, config);
            this.ngZone.run(() => {
              // TODO : solve error :
              // ERROR Error: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'null:
              // Non bloquant : ca fonctionne qd meme....
              // this.formGroup.setValue(this.config);

              // TODO : better data transformer design associated to Forms Models...
              let transforms: any = {};
              try {
                const authRef = Object.keys(this.config['moon-manager-timing-pivot'].authorReferencial).map(k => {
                  const v = this.config['moon-manager-timing-pivot'].authorReferencial[k];
                  return `${k}===${v}`;
                });
                transforms['moon-manager-timing-pivot'] = {
                  authorReferencial: authRef
                };
                // TODO : input multiple do not seem to reflect Name => case Issue or something buggy ?
                // + below is more like a hack since array value is ignored from PATCH. TODO : debug or patch lib ?
                const pivotFm = <DynamicFormGroupModel>fm.find(
                  (childFm: DynamicFormControlModel, index: number, src: DynamicFormControlModel[]) => {
                    return 'moon-manager-timing-pivot' === childFm.id;
                  }
                );
                const authRefFm = <DynamicInputModel>pivotFm.group.find(
                  (childFm: DynamicFormControlModel, index: number, src: DynamicFormControlModel[]) => {
                    return 'authorReferencial' === childFm.id;
                  }
                );
                authRefFm.value = authRef;
              } catch (e) {
                MonwooReview.debug(e);
              }
              try {
                const regexsRef = this.config['moon-manager-client-files-loader'].captureRegex;
                transforms['moon-manager-client-files-loader'] = {
                  authorReferencial: regexsRef
                };
                // TODO : input multiple do not seem to reflect Name => case Issue or something buggy ?
                // + below is more like a hack since array value is ignored from PATCH. TODO : debug or patch lib ?
                const cflFm = <DynamicFormGroupModel>fm.find(
                  (childFm: DynamicFormControlModel, index: number, src: DynamicFormControlModel[]) => {
                    return 'moon-manager-client-files-loader' === childFm.id;
                  }
                );
                const captureRegex = <DynamicInputModel>cflFm.group.find(
                  (childFm: DynamicFormControlModel, index: number, src: DynamicFormControlModel[]) => {
                    return 'captureRegex' === childFm.id;
                  }
                );
                captureRegex.value = regexsRef;
              } catch (e) {
                MonwooReview.debug(e);
              }

              const patch = shallowMerge(1, this.config, transforms);
              console.log('Patching form : ', patch);
              this.formGroup.patchValue(patch);
            });
          })();
        },
        error => {
          console.error('Fail to fetch config');
        }
      );
    });
  }

  ngOnInit() {
    this.browser = detect();
    if (this.browser) {
      console.log(this.browser.name);
      console.log(this.browser.version);
      console.log(this.browser.os);
      const testedName = 'chrome';
      const testedMajorVersion = '71';
      const majorVersion = this.browser.version.split('.')[0];

      if (this.browser.name !== testedName || parseInt(testedMajorVersion) > parseInt(majorVersion)) {
        this.i18nService
          .get(extract('mm.param.configWarning.notTestedBrowser'), {
            name: this.browser.name,
            version: majorVersion,
            testedName: testedName,
            testedVersion: testedMajorVersion
          })
          .subscribe(t => {
            this.notif.warn('WebBrowser', t, {
              timeOut: 6000
            });
          });
      }
    }
    // switch (this.browser && this.browser.name) {
    //   case 'chrome':
    //     console.log('supported');
    //   // case 'firefox':
    //   //   console.log('supported');
    //   //   break;

    //   // case 'edge':
    //   //   console.log('kinda ok');
    //   //   break;

    //   default:
    //     console.log('not supported');
    // }

    this.updateConfigForm();
    this.i18nService.onLangChange.subscribe((event: LangChangeEvent) => {
      this.updateConfigForm();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('Having changes : ', changes); // binding issue or pb with deep object fail to observe ?
  }

  ngAfterViewInit() {
    // TODO : will not change if live edit in form, pb about form building ?
    // may need to build form structure JS Side ? solved by simple 'save btn' for now...
    // this.paramsForm.form.valueChanges.subscribe(allConfigs => {
    //   console.log('Having changes : ', allConfigs);
    // });
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
  saveAction(e: any) {
    this.ll.showLoader();

    let changes = this.paramsForm.form.value;

    // TODO : better deep objects mappings : reactive forms ?
    // Quick hack for V1 pré-prod below :
    // let agFields = changes['moon-manager-timing-pivot'].agregationsFields;
    // agFields = typeof agFields === 'string' ? agFields.split(',') : agFields;
    // changes['moon-manager-timing-pivot'].agregationsFields = agFields;
    const authorArr = changes['moon-manager-timing-pivot'].authorReferencial;
    let authorAssoc = {};
    if (authorArr) {
      authorArr.forEach((aToA: string) => {
        const [from, to] = aToA.split('===');
        authorAssoc[from] = to;
      });
    }

    this.storage.getItem<any>('config', {}).subscribe((globalConfig: any) => {
      // Avoid to change changes, may change inside form values to...
      // changes['moon-manager-timing-pivot'].authorReferencial = authorAssoc;
      const transformed = shallowMerge(1, globalConfig, changes, {
        'moon-manager-timing-pivot': { authorReferencial: authorAssoc }
      });
      console.log('Saving changes : ', transformed);

      if (!globalConfig) globalConfig = {};
      // avoid deep merging restoring def config, or keep empty val in config ? or default only if null ?
      this.storage.setItem('config', transformed).subscribe(() => {
        this.medias.refreshSettings();
        this.i18nService.get(extract('mm.param.notif.saveSucced')).subscribe(t => {
          this.notif.success(t);
          this.ll.hideLoader();
        });
      }, this.errorHandler);
    }, this.errorHandler);
  }

  resetConfigAction(e: any) {
    this.ll.showLoader();
    // let changes = this.paramsForm.form.value;
    (async () => {
      let freshConf = await getFreshConf(this);
      console.log('Reseting config to : ', freshConf);
      await this.medias.clear();
      this.timings.clear();
      this.storage.clear().subscribe(() => {
        this.updateConfigForm();
        this.medias.refreshSettings();
        this.i18nService.get(extract('mm.param.notif.cleaningParametersOk')).subscribe(t => {
          this.notif.success(t);
          this.ll.hideLoader();
        });
      }, this.errorHandler);
    })();
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

  processingExport(e: any, dest: string) {
    this.ll.showLoader();
    // TODO : auto download right format
    const exportData = (src: any, data: any) => {
      if ('csv' === this.exportFmt) {
        // https://www.papaparse.com/docs
        var csvData = data
          ? this.papaParse.unparse(data, {
              quotes: true,
              // quoteChar: '"',
              // escapeChar: '"',
              delimiter: ',',
              header: false,
              newline: '\r\n'
            })
          : '';
        var blob = new Blob([csvData], { type: 'text/csv' });
        var url = window.URL.createObjectURL(blob);
      } else if ('json' === this.exportFmt) {
        // const str = stringifyJSON(src); // Will add 1 object with array keys at first for array... strange json...
        let str = null;
        if (src instanceof Map) {
          // specific transform for Map types
          str = JSON.stringify(Array.from(src.entries()));
        } else {
          str = JSON.stringify(src);
        }
        var blob = new Blob([str], { type: 'text/json' });
        var url = window.URL.createObjectURL(blob);
      } else if ('yaml' === this.exportFmt) {
        // const str = stringifyJSON(src); // Will add 1 object with array keys at first for array... strange json...
        let str = null;
        if (src instanceof Map) {
          // specific transform for Map types
          str = YAML.stringify(Array.from(src.entries()));
        } else {
          str = YAML.stringify(src);
        }
        var blob = new Blob([str], { type: 'text/yaml' });
        var url = window.URL.createObjectURL(blob);
      } else {
        this.i18nService
          .get(extract('mm.param.notif.exportFail'), {
            dest: dest,
            exportFmt: this.exportFmt
          })
          .subscribe(t => {
            this.notif.error(t);
          });
        this.ll.hideLoader();
        return;
      }

      // window.open(url);
      const element = document.createElement('a');
      element.href = url;
      element.download = dest + moment().format('-YYYYMMDDHHmmss.') + this.exportFmt;
      document.body.appendChild(element);
      element.click();
      this.i18nService
        .get(extract('mm.param.notif.exportSucced'), {
          dest: dest,
          exportFmt: this.exportFmt
        })
        .subscribe(t => {
          this.notif.success(t);
        });
      this.ll.hideLoader();
    };
    // const data: any = null;
    (async () => {
      if (dest === 'medias') {
        const src = await this.medias.toArray();
        exportData(src, src);
        // this.storage.getItem<any>('medias-buffer', {}).subscribe((msArr: any) => {
        //   exportData(msArr);
        // });
      } else if ((dest = 'timings')) {
        const timingsSrc = await this.timings.get();
        exportData(timingsSrc, timingsSrc.map(t => Object.keys(t).map(k => t[k])));
        // this.storage.getItem<any>('timings', {}).subscribe((msArr: any) => {
        //   exportData(msArr);
        // });
      } else {
        this.i18nService
          .get(extract('mm.param.notif.destUnavailable'), {
            dest: dest,
            exportFmt: this.exportFmt
          })
          .subscribe(t => {
            this.notif.error(t);
          });
        this.ll.hideLoader();
      }
    })();
  }

  finalizeImports() {
    this.medias.finalizeBulks();
    this.timings.finalizeBulks();
    this.ll.hideLoader();
  }

  processingImport(f: File, dest: string) {
    this.ll.showLoader();
    const fileName = f.name;
    const reader: FileReader = new FileReader();
    reader.onload = e => {
      const dataStr: string = <string>reader.result;
      let importCount = 0;
      let importLength = 0;
      if (dest === 'medias' && fileName.match(/.*\.csv$/i)) {
        const parsed = this.papaParse.parse(dataStr, { header: false });
        // MonwooReview.debug('Processing medias : ', parsed);
        importLength = parsed.data.length;

        // TODO : scheme checking ? what if bad format ?
        // this.processInc(null, parsed.data.length);
        parsed.data.forEach((row: string[], idx: number) => {
          this.mediasProgress = (100 * (idx + 1)) / importLength;
          importCount++;
          if (row.length != 3) {
            this.i18nService
              .get(extract('Fail to import row {{idx}} for {{file}}'), {
                idx: idx,
                file: fileName
              })
              .subscribe(t => {
                console.warn(t);
                this.notif.warn(t);
              });
            return;
          }
          this.medias.pushDataUrlMedia(row[0], row[2]);
        });
      } else if (dest === 'medias' && fileName.match(/.*\.json$/i)) {
        const jsonData = JSON.parse(dataStr);
        importLength = jsonData.length;
        jsonData.forEach((tuple: [string, string, string], idx: number) => {
          this.mediasProgress = (100 * (idx + 1)) / importLength;
          importCount++;
          if (tuple.length != 3) {
            this.i18nService
              .get(extract('Fail to import row {{idx}} for {{file}}'), {
                idx: idx,
                file: fileName
              })
              .subscribe(t => {
                console.warn(t);
                this.notif.warn(t);
              });
            return;
          }

          this.medias.pushDataUrlMedia(tuple[0], tuple[2]);
        });
      } else if (dest === 'medias' && fileName.match(/.*\.yaml$/i)) {
        const yamlData = YAML.parse(dataStr);
        importLength = yamlData.length;
        yamlData.forEach((tuple: [string, string, string], idx: number) => {
          this.mediasProgress = (100 * (idx + 1)) / importLength;
          importCount++;
          if (tuple.length != 3) {
            this.i18nService
              .get(extract('Fail to import row {{idx}} for {{file}}'), {
                idx: idx,
                file: fileName
              })
              .subscribe(t => {
                console.warn(t);
                this.notif.warn(t);
              });
            return;
          }

          this.medias.pushDataUrlMedia(tuple[0], tuple[2]);
        });
      } else if (dest === 'timings' && fileName.match(/.*\.csv$/i)) {
        const parsed = this.papaParse.parse(dataStr, { header: false });
        console.log('TODO : process git log datas : ', parsed);
        importLength = parsed.data.length;

        // TODO : scheme checking ? what if bad format ?
        // this.processInc(null, parsed.data.length);
        parsed.data.forEach((row: string[], idx: number) => {
          let t = new Timing();
          let tKeys = Object.keys(t);
          this.timingsProgress = (100 * (idx + 1)) / importLength;
          ++importCount;
          // ensure row is Timing row :
          if (row.length != tKeys.length) {
            this.i18nService
              .get(extract('Fail to import row {{idx}} for {{file}}'), {
                idx: idx,
                file: fileName
              })
              .subscribe(t => {
                console.warn(t);
                this.notif.warn(t);
              });
            return;
          }
          // Prepare dataset :
          const transformers = {
            id: (v: string) => parseInt(v),
            DateTime: (v: string) => moment(v).toDate(),
            SegmentMin: (v: string) => moment(v).toDate(),
            SegmentDeltaHr: (v: string) => parseFloat(v),
            SegmentMax: (v: string) => moment(v).toDate(),
            SegmentOverride: (v: string) => parseFloat(v),
            LinearWorkloadAmount: (v: string) => parseFloat(v),
            WorkloadAmount: (v: string) => parseFloat(v),
            TJM: (v: string) => parseFloat(v),
            TJMWorkloadByDay: (v: string) => parseFloat(v),
            Price: (v: string) => parseFloat(v),
            // will match one and only one of the string 'true','1', or 'on' rerardless
            // of capitalization and regardless off surrounding white-space.
            isHidden: (v: string) => /^\s*(true|1|on)\s*$/i.test(v)
          };

          // overwrite timing :
          tKeys.forEach((k, idx) => {
            if (k in transformers) {
              t[k] = transformers[k](row[idx]);
            } else {
              t[k] = row[idx];
            }
          });
          this.timings.addBulk([t]);
        });
      } else if (dest === 'timings' && fileName.match(/.*\.json$/i)) {
        const jsonData = JSON.parse(dataStr);
        importLength = jsonData.length;
        this.timings.set(
          jsonData.reduce((acc: Timing[], tRaw: {}, idx: number) => {
            this.timingsProgress = (100 * (idx + 1)) / importLength;
            importCount++;
            let t: Timing = new Timing();
            let tKeys = Object.keys(t);
            if (Object.keys(tRaw).length !== tKeys.length) {
              this.i18nService
                .get(extract('Fail to import row {{idx}} for {{file}}'), {
                  idx: idx,
                  file: fileName
                })
                .subscribe(t => {
                  console.warn(t);
                  this.notif.warn(t);
                });
              return acc;
            }
            acc.push(Object.assign(t, tRaw));
            return acc;
          }, [])
        );
      } else if (dest === 'timings' && fileName.match(/.*\.yaml$/i)) {
        const yamlData = YAML.parse(dataStr);
        importLength = yamlData.length;
        this.timings.set(
          yamlData.reduce((acc: Timing[], tRaw: {}, idx: number) => {
            this.timingsProgress = (100 * (idx + 1)) / importLength;
            importCount++;
            let t: Timing = new Timing();
            let tKeys = Object.keys(t);
            if (Object.keys(tRaw).length !== tKeys.length) {
              this.i18nService
                .get(extract('Fail to import row {{idx}} for {{file}}'), {
                  idx: idx,
                  file: fileName
                })
                .subscribe(t => {
                  console.warn(t);
                  this.notif.warn(t);
                });
              return acc;
            }
            acc.push(Object.assign(t, tRaw));
            return acc;
          }, [])
        );
      } else {
        console.log('Unknow import dest : ', dest);
        this.finalizeImports();
        return;
      }
      this.i18nService
        .get(extract('Succed to import {{importCount}}/{{length}} for {{file}}'), {
          importCount: importCount,
          length: importLength,
          file: fileName
        })
        .subscribe(t => {
          console.log(t);
          this.notif.success(t);
        });
      this.finalizeImports();
      // this.processDec(this.getFilePath(f));
    };
    reader.onabort = (ev: ProgressEvent) => {
      console.log('Aborting : ', f);
      this.finalizeImports();
      // this.processDec(this.getFilePath(f));
    };
    reader.onerror = (ev: ProgressEvent) => {
      console.error('Error for : ', f);
      this.finalizeImports();
      // this.processDec(this.getFilePath(f));
    };
    reader.readAsText(f);
  }

  onUploadError(e: any, dst: string) {
    console.log('Upload error', e);
    this.i18nService
      .get(extract('mm.param.error.incompatibleFile'), {
        dest: dst
      })
      .subscribe(t => {
        this.notif.error(t);
      });
  }

  cmdToCopy: string = `git log --all --date=iso --pretty=format:'"%h","%an","%ad","%s"' > git_logs.csv`;
  onSuccedToCopyCmd(e: any) {
    this.i18nService.get(extract('mm.param.tuto.gitCmd.copySucced')).subscribe(t => {
      this.notif.success(t);
    });
  }
}

// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import {
  Component,
  OnInit,
  ViewChild,
  Input,
  NgZone,
  Renderer2,
  RendererFactory2,
  ElementRef,
  Output,
  EventEmitter
} from '@angular/core';
import { NgForm, FormGroup, Validators, FormBuilder } from '@angular/forms';
// import { LocalStorage } from '@ngx-pwa/local-storage';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';
import { BackendService, ProviderID } from '@moon-box/services/backend.service';
import { MessagesService } from '@moon-box/services/messages.service';

import { DynamicFormModel, DynamicFormLayout, DynamicFormService, validate } from '@ng-dynamic-forms/core';
import { I18nService } from '@app/core';
import { shallowMerge } from '@moon-manager/tools';
import { FormType, FORM_LAYOUT, formModel, formDefaults } from './login-form.model';
import { NotificationsService } from 'angular2-notifications';
import { extract } from '@app/core';
import { FormType as FiltersFormType } from '@moon-box/components/boxes/filters-form.model';
import { pluck, delay, debounceTime, tap } from 'rxjs/operators';
import { forkJoin, of, from } from 'rxjs';
import * as moment from 'moment';

import { Logger } from '@app/core/logger.service';
const logReview = new Logger('MonwooReview');

@Component({
  selector: 'moon-box-reader',
  templateUrl: './box-reader.component.html',
  styleUrls: ['./box-reader.component.scss']
})
export class BoxReaderComponent implements OnInit {
  @Input() id: string;
  @Input()
  set filters(filters: FiltersFormType) {
    this.loginData = <FormType>shallowMerge(1, this.loginData, filters);
    this.updateForm();
  }
  @Output() onIdChange = new EventEmitter<[string, string]>();

  @ViewChild('loginForm') loginForm: NgForm = null;
  @ViewChild('eltRef') eltRef: ElementRef = null;

  // formModel: Promise<DynamicFormModel> = configFormModel(this);
  formModel: DynamicFormModel = null;
  // TODO : how to custom layout for embed form with NO html code ?
  // Need some code pattern to avoid id's clash ?
  formLayout: DynamicFormLayout = FORM_LAYOUT;
  // formGroup: BehaviorSubject<FormGroup> = new BehaviorSubject<FormGroup>(new FormGroup({}));
  formGroup: FormGroup = null;

  loginData: FormType = null;

  messages: any = null;

  renderer: Renderer2 = null;

  hasMoreMsgs: boolean = false;

  isCondensed: boolean = true;

  constructor(
    private fb: FormBuilder,
    public backend: BackendService,
    private i18nService: I18nService,
    private storage: SecuStorageService,
    private formService: DynamicFormService,
    private ngZone: NgZone,
    private notif: NotificationsService,
    private rendererFactory: RendererFactory2,
    private msgs: MessagesService
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
    // formDefaults(this).then(d => {
    //   this.loginData = d;
    //   this.updateForm();
    // });
    this.updateForm();
  }

  toggleConfigs() {
    //if (this.filtersForm.classList (this.filtersForm, 'src'))
    // TODO refactor : do it more angular ways with class directives ... :
    this.isCondensed = this.eltRef.nativeElement.classList.contains('condensed');
    if (this.isCondensed) {
      this.renderer.removeClass(this.eltRef.nativeElement, 'condensed');
    } else {
      this.renderer.addClass(this.eltRef.nativeElement, 'condensed');
    }
    this.isCondensed = !this.isCondensed;
    this.updateIFrames();
  }

  errorHandler(err: any) {
    logReview.warn('BoxReader error', err);
  }

  ngOnInit() {
    // const imapProvider = this.imapProviders[this.defaultProvider];
    const ctx = {};

    // this.readMessages();
  }

  selectProvider(id: ProviderID) {
    this.loginData.selectedProvider = id;
    this.loginData.params.mailhost = this.backend.providers[id].serverUrl;
    this.loginData.params.mailport = this.backend.providers[id].serverPort;
    this.updateForm();
  }

  async updateForm() {
    formModel(this).then((fm: DynamicFormModel) => {
      this.formModel = fm;
      this.formGroup = this.formService.createFormGroup(this.formModel);

      // Load from params from local storage ? :
      if (this.loginData.keepInMemory) {
        this.storage.getItem<FormType>('moon-box-' + this.id, {}).subscribe(
          loginData => {
            (async () => {
              // Called if data is valid or null
              let freshDefaults = shallowMerge(1, await formDefaults(this), loginData);
              this.loginData = <FormType>shallowMerge(1, freshDefaults, this.loginData);
              // transforms... ?
              this.loginData.keepInMemory = true;
              let transforms = this.loginData;
              this.loginData = <FormType>shallowMerge(1, this.loginData, transforms);
              logReview.debug('Patching form : ', this.loginData);
              this.ngZone.run(() => {
                this.formGroup.patchValue(this.loginData);
              });
            })();
          },
          error => {
            logReview.warn('Fail to fetch config for ', this.loginData);
          }
        );
      } else {
        this.formGroup.patchValue(this.loginData);
      }
    });
  }

  readMessages() {
    if (this.formGroup) {
      this.backend.fetchMsg(this.formGroup.value._username).subscribe((messages: any) => {
        logReview.debug('BoxReader did fetch msgs ', this.messages);
        if (!messages.status || messages.status.errors.length) {
          logReview.warn('BoxReader fetch errors ', messages.status ? messages.status.errors : messages);
          this.i18nService.get(extract('mm.box-reader.notif.fetchFail')).subscribe(t => {
            this.notif.warn(t);
            // this.ll.hideLoader();
          });
        } else {
          this.hasMoreMsgs = messages.numResults !== messages.totalCount; // TODO : pagination etc...

          this.messages = messages;
          this.msgs.pushMessages(messages);
          this.updateIFrames();
        }
      }, this.errorHandler);
    } else {
      logReview.warn('Algo issue, trying to read msg when form is not yet ready');
    }
  }

  updateIFrames() {
    // TODO : need to forkJoin all multi-box call ? reason of auth transfert avoided ? Nb req limits ?
    of(() => {
      // Backend is configured to allow only One access to email content
      // Show only if needed, otherwise user will have to connect back to get the content
      let iframes = document.querySelectorAll('iframe[data-didload="0"]');
      // iframes.forEach(f => {
      //   // this.renderer.setAttribute(f, 'src', f.getAttribute('data-src'));
      //   if (!parseInt(f.getAttribute('data-didLoad'))) {
      //     f.setAttribute('src', f.getAttribute('data-src'));
      //     f.setAttribute('data-didLoad', '1');
      //   }
      // });
      // https://www.learnrxjs.io/operators/transformation/scan.html
      // https://github.com/ReactiveX/RxJava/issues/3505
      from(iframes)
        .pipe(
          delay(1000),
          tap(f => {
            // this.renderer.setAttribute(f, 'src', f.getAttribute('data-src'));
            if (!parseInt(f.getAttribute('data-didLoad'))) {
              f.setAttribute('src', f.getAttribute('data-src'));
              f.setAttribute('data-didLoad', '1');
            }
          })
        )
        .subscribe(() => {});
    })
      .pipe(delay(200))
      .subscribe((callback: any) => callback());
  }

  login(event: any) {
    const val: FormType = this.loginForm.form.value;
    if (this.loginForm.form.valid) {
      if (!/\*#__hash/.test(val._password)) {
        val._password = '*' + '#__hash' + (Math.random().toString(36) + '777777777').slice(2, 9) + btoa(val._password);
      }
      this.loginData = <FormType>shallowMerge(1, this.loginData, val);
      let storeData = this.loginData;
      if (!this.loginData.keepPasswordsInMemory) {
        storeData = <FormType>shallowMerge(1, this.loginData, {
          _password: ''
        });
      }
      if (this.loginData.keepInMemory) {
        this.storage.setItem('moon-box-' + this.id, storeData).subscribe(() => {
          // TODO : fluent design review : do not show useless msg, if it works, data
          // showing up is enough...

          // TODO : may be rewrite all in ngx-storage state system ?
          logReview.warn('Algo issue ? form refresh and storage sync....');
          // this.i18nService.get(extract('mm.param.notif.saveSucced')).subscribe(t => {
          //   this.notif.success(t);
          //   // this.ll.hideLoader();
          // });
        }, this.errorHandler);
      } else {
        this.storage.removeItem('moon-box-' + this.id).subscribe(() => {
          logReview.debug("'No save required for moon-box-' + this.id");
        }, this.errorHandler);
      }
      // Transforms for login purpose :
      this.loginData.periode.fetchStartStr = this.loginData.periode.fetchStart
        ? moment(this.loginData.periode.fetchStart).format('YYYY/MM/DD')
        : null;
      this.loginData.periode.fetchEndStr = this.loginData.periode.fetchEnd
        ? moment(this.loginData.periode.fetchEnd).format('YYYY/MM/DD')
        : null;

      this.backend.login(this.loginData).subscribe(() => {
        logReview.debug('User is logged in');

        this.readMessages();
      });
    } else {
      this.i18nService
        .get(extract('mb.box-reader.login.formNotValid'), {
          formUserName: val._username
        })
        .subscribe(t => {
          this.notif.error('', t);
        });
    }
  }
  loadNext(e: any) {
    // TODO: paginantion
    logReview.warn('TODO');
  }
  // Avoid below : better to let Collection handle the position etc...
  // => keep design at component level Max possible VS Quicks needs for current sprint
  // moveSelfStorage(direction: 'stepTowardStart' | 'stepTowardEnd') {
  //   const self = this;
  //   return new Promise<boolean>(function(resolve, reject) {
  //     const errHandler = (e: any) => {
  //       self.errorHandler(e);
  //       reject('Storage error');
  //     };
  //     self.storage.getItem('moon-box-' + self.id).subscribe((selfBox: any) => {
  //       const swapId = 'moon-box-' + (direction === 'stepTowardStart' ? -1 : 1);
  //       self.storage.getItem('moon-box-' + swapId).subscribe((swapBox: any) => {
  //         self.storage.setItem('moon-box-' + swapId, selfBox).subscribe(() => {
  //           self.storage.setItem('moon-box-' + self.id, swapBox).subscribe(() => {
  //             logReview.debug('Succed to swipe storage of moon-box-' + self.id + ' ' + direction);
  //             self.onIdChange.emit([self.id, swapId]);
  //             resolve(true);
  //           }, errHandler);
  //         }, errHandler);
  //       }, errHandler);
  //     }, errHandler);
  //   });
  // }
  removeSelfStorage() {
    const self = this;
    return new Promise<boolean>(function(resolve, reject) {
      const errHandler = (e: any) => {
        self.errorHandler(e);
        reject('Storage error');
      };
      self.storage.removeItem('moon-box-' + self.id).subscribe(() => {
        logReview.debug('Succed to remove moon-box-' + self.id);
        self.onIdChange.emit([self.id, null]);
        resolve(true);
      }, errHandler);
    });
  }
}

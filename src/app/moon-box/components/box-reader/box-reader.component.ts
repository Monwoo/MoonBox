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
  TemplateRef,
  Output,
  EventEmitter,
  HostListener
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
import { debounceTime, delay, last, map, tap, startWith } from 'rxjs/operators';
import { fromEvent, of, from } from 'rxjs';
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
  @Input()
  extendedActions: TemplateRef<any> = null;

  @Output() onIdChange = new EventEmitter<[string, string]>();

  @ViewChild('loginForm') loginForm: NgForm = null;
  @ViewChild('eltRef') eltRef: ElementRef = null;
  @HostListener('submit', ['$event'])
  onSubmit(event: any) {
    if (!this.loginForm.form.valid) {
      let target;
      for (var i in this.loginForm.form.controls) {
        // need to check errors since did use 'setError' method from login action on bad user ids ?
        // TODO : remove below hack, avoiding tricky case for now :
        if ('_username' === i) {
          continue;
        }
        if (!this.loginForm.form.controls[i].valid) {
          target = this.loginForm.form.controls[i];
          break;
        }
      }
      if (target) {
        // https://stackoverflow.com/questions/41173027/angular-2-focus-on-first-invalid-input-after-click-event
        // https://stackoverflow.com/questions/43553544/how-can-i-manually-set-an-angular-form-field-as-invalid
        // $('html,body').animate({scrollTop: $(target.nativeElement).offset().top}, 'slow');
        // logReview.debug(target);
        target.markAsTouched();
        if (this.isCondensed) {
          this.toggleConfigs();
        }
      }
    }
  }

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

  ctx = { boxId: this.id };

  isScreenSmall$: any;

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
    formDefaults(this).then(defData => {
      this.loginData = defData;

      this.loadFormFromStorage();
      this.storage.onUnlock.subscribe(() => {
        this.loadFormFromStorage();
      });
    });

    // https://stackoverflow.com/questions/47034573/ngif-hide-some-content-on-mobile-screen-angular-4
    // https://getbootstrap.com/docs/4.0/layout/grid/#grid-options
    // Checks if screen size is less than 720 pixels
    const checkScreenSize = () => document.body.offsetWidth < 720; // 720px < Medium size BS > 960px

    // Create observable from window resize event throttled so only fires every 500ms
    const screenSizeChanged$ = fromEvent(window, 'resize')
      .pipe(debounceTime(500))
      .pipe(map(checkScreenSize));

    // Start off with the initial value use the isScreenSmall$ | async in the
    // view to get both the original value and the new value after resize.
    this.isScreenSmall$ = screenSizeChanged$.pipe(startWith(checkScreenSize()));
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

  ngAfterViewChecked() {
    this.updateIFrames();
  }

  selectProvider(id: ProviderID) {
    this.loginData.selectedProvider = id;
    this.loginData.params.mailhost = this.backend.providers[id].serverUrl;
    this.loginData.params.mailport = this.backend.providers[id].serverPort;
    this.updateForm();
  }

  isFormUpdating = false; // TODO : better design pattern with task chancelation and re-spawn from start ?
  async updateForm() {
    if (this.isFormUpdating) {
      // re-spawn ?
      return;
    }
    this.isFormUpdating = true;
    // Re-generate form : TODO remove code duplication
    formModel(this).then((fm: DynamicFormModel) => {
      this.formModel = fm;
      this.formGroup = this.formService.createFormGroup(this.formModel);
      logReview.debug('Patching form : ', this.loginData);
      this.formGroup.patchValue(this.loginData);
      this.isFormUpdating = false;
    });
  }

  loadFormFromStorage() {
    return new Promise<boolean>((resolve, reject) => {
      if (this.loginData.keepInMemory) {
        this.storage.getItem<FormType>('moon-box-' + this.id, {}).subscribe(
          loginData => {
            (async () => {
              // Called if data is valid or null
              let freshDefaults = shallowMerge(1, await formDefaults(this), this.loginData);
              this.loginData = <FormType>shallowMerge(1, freshDefaults, loginData);
              // transforms... ?
              // this.loginData.keepInMemory = true;
              let transforms = this.loginData;
              this.loginData = <FormType>shallowMerge(1, this.loginData, transforms);
              await this.updateForm();
              resolve();
            })();
          },
          error => {
            reject();
            logReview.warn('Fail to fetch config for ', this.loginData);
          }
        );
      }
    });
  }

  readMessages(page = 1) {
    if (this.formGroup) {
      this.backend
        .fetchMsg(this.loginData.selectedProvider, this.formGroup.value._username, page)
        .subscribe((messages: any) => {
          if (!messages.status || messages.status.errors.length) {
            logReview.warn('BoxReader fetch errors ', messages.status ? messages.status.errors : messages);
            if (
              messages.status &&
              messages.status.errors.reduce((acc: boolean, err: string[]) => {
                if ('Exception Exception: cannot login, wrong user or password' === err[1]) {
                }
              })
            ) {
              this.i18nService.get(extract('mm.box-reader.notif.wrongUserOrPassword')).subscribe(t => {
                this.notif.warn(t);
                this.formGroup.controls['_username'].setErrors({ incorrect: true });
                this.formGroup.controls['_username'].markAsTouched();
                if (this.formGroup.controls['_password']) {
                  this.formGroup.controls['_password'].setErrors({ incorrect: true });
                }
              });
            } else {
              this.i18nService.get(extract('mm.box-reader.notif.fetchFail')).subscribe(t => {
                this.notif.warn(t);
                // this.ll.hideLoader();
              });
            }
          } else {
            this.hasMoreMsgs = messages.numResults !== messages.totalCount; // TODO : pagination etc...
            // TODO : better data structure to auto fix multiple reads of same page issue...
            this.messages = shallowMerge(1, this.messages, messages);
            logReview.debug('BoxReader did fetch msgs ', this.messages);
            this.msgs.pushMessages(messages);
            this.updateIFrames();
          }
        }, this.errorHandler);
    } else {
      logReview.warn('Algo issue, trying to read msg when form is not yet ready');
    }
  }

  isProcessingIFrames = false;
  public updateIFrames() {
    return;
    // TODO Refactor : finish removing updateIFrames from view components level...

    if (this.isProcessingIFrames) {
      // logReview.debug('Frame updates already in process');
      return;
    }
    this.isProcessingIFrames = true;
    // TODO : need to forkJoin all multi-box call ? reason of auth transfert avoided ? Nb req limits ?
    of(() => {
      // Backend is configured to allow only One access to email content
      // Show only if needed, otherwise user will have to connect back to get the content
      let iframes = document.querySelectorAll('iframe[data-didload="0"]');
      if (!iframes.length) {
        this.isProcessingIFrames = false;
        return;
      }
      // iframes.forEach(f => {
      //   // this.renderer.setAttribute(f, 'src', f.getAttribute('data-src'));
      //   if (!parseInt(f.getAttribute('data-didLoad'))) {
      //     f.setAttribute('src', f.getAttribute('data-src'));
      //     f.setAttribute('data-didLoad', '1');
      //   }
      // });
      // https://www.learnrxjs.io/operators/transformation/scan.html
      // https://github.com/ReactiveX/RxJava/issues/3505
      // https://www.learnrxjs.io/operators/filtering/last.html
      // https://www.learnrxjs.io/operators/filtering/debounce.html
      from(iframes) // TODO : refactor and bundle down in backend.service => Async Worker Stack design pattern
        .pipe(
          delay(1000),
          tap(f => {
            // this.renderer.setAttribute(f, 'src', f.getAttribute('data-src'));
            if (!parseInt(f.getAttribute('data-didLoad'))) {
              f.setAttribute('src', f.getAttribute('data-src'));
              f.setAttribute('data-didLoad', '1');
            }
          }),
          last(() => {
            this.isProcessingIFrames = false;
            logReview.debug('IFrame updates OK');
            return true;
          })
        )
        .subscribe(() => {});
    })
      .pipe(delay(200))
      .subscribe((callback: any) => callback());
  }

  login(event: any) {
    const val: FormType = this.loginForm.form.value;
    // Nghost event not already detected ? TODO : avoid quick fix below :
    this.onSubmit(event);
    if (this.loginForm.form.valid) {
      if (!/\*#__hash/.test(val._password)) {
        val._password = '*' + '#__hash' + (Math.random().toString(36) + '777777777').slice(2, 9) + btoa(val._password);
      }
      this.loginData = <FormType>shallowMerge(1, this.loginData, val);
      let storeData = this.loginData;

      // https://stackoverflow.com/questions/43553544/how-can-i-manually-set-an-angular-form-field-as-invalid
      // TODO : advanced realtime enduser error feedback (need to click for now to get those)
      // Below for quick hack, better to implement full custom validator for regular case....
      // formData.form.controls['email'].setErrors({'incorrect': true});

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
    if (this.messages) {
      this.readMessages(this.messages.nextPage);
    } else {
      logReview.debug('Trying to load next page of : ', this.id);
    }
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

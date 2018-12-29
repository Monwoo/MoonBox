// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import {
  Component,
  OnInit,
  ViewChild,
  NgZone,
  ViewContainerRef,
  ElementRef,
  Renderer2,
  RendererFactory2,
  HostListener,
  QueryList,
  ViewChildren
} from '@angular/core';
import { NgForm, FormArray, Validators, FormBuilder } from '@angular/forms';
import { FormType, FORM_LAYOUT, formModel, formDefaults, ContextType, contextDefaults } from './filters-form.model';
import { I18nService } from '@app/core';
import { DynamicFormArrayModel, DynamicFormLayout, DynamicFormService, validate } from '@ng-dynamic-forms/core';
// import { LocalStorage } from '@ngx-pwa/local-storage';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';
import { MessagesService } from '@moon-box/services/messages.service';
import { debounceTime, delay, last, map, tap, startWith, concatMap, catchError } from 'rxjs/operators';
import { fromEvent, of, from, Observable } from 'rxjs';
import { LocalStorage, JSONSchemaBoolean } from '@ngx-pwa/local-storage';

import { shallowMerge } from '@moon-manager/tools';
import { NotificationsService } from 'angular2-notifications';
import { extract } from '@app/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { BoxReaderComponent } from '@moon-box/components/box-reader/box-reader.component';
import { Logger } from '@app/core/logger.service';
import { LoadingLoaderService } from '@moon-manager/services/loading-loader.service';
const logReview = new Logger('MonwooReview');

import * as moment from 'moment';
import { environment } from '@env/environment';

export const MY_FORMATS = {
  parse: {
    dateInput: 'YYYY/MM/DD'
  },
  display: {
    dateInput: 'YYYY/MM/DD',
    monthYearLabel: 'YYYY MMM',
    dateA11yLabel: 'YYYY/MM/DD',
    monthYearA11yLabel: 'YYYY MMMM'
  }
};

@Component({
  selector: 'moon-boxes',
  templateUrl: './boxes.component.html',
  styleUrls: ['./boxes.component.scss'],
  providers: [
    {
      provide: MAT_DATE_LOCALE,
      useFactory: (translateService: I18nService) => {
        return translateService.language;
      },
      deps: [I18nService]
    },
    { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE] },
    { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS }
  ]
})
export class BoxesComponent implements OnInit {
  // @ViewChild('filtersForm') filtersForm: ElementRef<NgForm> = null;
  @ViewChild('filtersFormRef') filtersFormRef: ElementRef<HTMLFormElement> = null;
  @ViewChild('filtersForm') filtersForm: NgForm = null;
  @ViewChildren(BoxReaderComponent) boxViews!: QueryList<BoxReaderComponent>;

  isSticky: boolean = false;
  initialStickyOffset: number = 0;
  initialStickyHeight: number = 0;

  @HostListener('window:scroll', ['$event'])
  checkScroll() {
    if (this.innerWidth < this.size.md) {
      return; // ignoring sticky effect for mobile devices
    }

    if (!this.filtersFormRef) return; // will waith for filters to be displayed
    const deltaScrollAvailable = document.body.scrollHeight - document.body.clientHeight;

    this.isSticky = window.pageYOffset >= this.initialStickyOffset && deltaScrollAvailable > 200;
    // this.filtersFormRef.nativeElement.getBoundingClientRect().bottom;
    if (this.isSticky) {
      this.filtersFormRef.nativeElement.parentElement.parentElement.style.marginTop = this.initialStickyHeight + 'px';
    } else {
      this.filtersFormRef.nativeElement.parentElement.parentElement.style.marginTop = '0px';
    }
  }
  @HostListener('submit', ['$event'])
  onSubmit(event: any) {
    // TODO : better design model for animation : should stack etc.... async for now....
    // if(!this.form.valid) {
    //   let target;
    //   for (var i in this.form.controls) {
    //     if(!this.form.controls[i].valid) {
    //       target = this.form.controls[i];
    //       break;
    //     }
    //   }
    //   if(target) {
    //     $('html,body').animate({scrollTop: $(target.nativeElement).offset().top}, 'slow');
    //   }
    // }
  }
  // https://stackoverflow.com/questions/45350716/detect-window-size-using-angular-4
  // https://getbootstrap.com/docs/4.0/layout/overview/
  size = {
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200
  };
  innerWidth = window.innerWidth;
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.innerWidth = window.innerWidth;
  }
  filters: ContextType = null;

  mbegKeyTransformerControl: FormArray;
  mbegKeyTransformerModel: DynamicFormArrayModel;
  renderer: Renderer2 = null;
  boxesIdxs: string[] = [];
  boxesIdxsLookup: { [key: string]: boolean } = {};
  isScreenSmall$: any;

  constructor(
    private i18nService: I18nService,
    private formService: DynamicFormService,
    public storage: SecuStorageService,
    private localStorage: LocalStorage,
    private ngZone: NgZone,
    private notif: NotificationsService,
    public eltRef: ViewContainerRef,
    private rendererFactory: RendererFactory2,
    public msgs: MessagesService,
    private ll: LoadingLoaderService
  ) {
    // Quick hack, since host listener to gets debug, TODO : HostListener bad usage to fix ?
    window.addEventListener('message', (e: any) => this.htmlMsgListener(e));
    // TODO : put in root component or ok since only used her ??
    // TODO : better desing pattern :
    // https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy#Changing_origin
    // => but not really working for our case, still cross domain issue to access iframe height...
    document.domain = environment.moonBoxFrontendDomain;

    (async () => {
      // http://json-schema.org/latest/json-schema-validation.html
      //
      const storageExpandBoxesConfigs = <boolean>await this.localStorage
        .getItem<boolean>('expand-boxes-configs', <JSONSchemaBoolean>{
          type: 'boolean',
          default: this.expandBoxesConfigs // TODO : why not using default if storage not found ??
        })
        .toPromise();
      this.expandBoxesConfigs =
        null === storageExpandBoxesConfigs ? this.expandBoxesConfigs : storageExpandBoxesConfigs;

      this.filters = await contextDefaults(this);
      this.updateForm();
      this.msgs.service.subscribe(messages => {
        // need to update form model to update formfields suggestions
        // TODO : better form design pattern to handle all that in simple form codes...
        formModel(this).then(model => {
          this.filters.model = model;
        });
      });
    })();
    this.renderer = this.rendererFactory.createRenderer(null, null);
    this.storage.setLockContainer(this.eltRef);
    this.refreshBoxesIdxs();
    this.storage.onUnlock.subscribe(() => {
      this.refreshBoxesIdxs();
      this.updateForm();
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

  refreshBoxesIdxs() {
    this.storage.setupStorage('lvl2'); // TODO: why need to set lvl 2, need better storage design pattern...
    this.storage.getItem('boxesIdxs').subscribe((bIdxs: string[]) => {
      if (bIdxs) {
        this.boxesIdxs = bIdxs;
      } else {
        this.addBox();
      }
    }, this.errorHandler);
    return this;
  }

  initShadowStickySizes() {
    // https://stackoverflow.com/questions/5598743/finding-elements-position-relative-to-the-document
    const getOffsetTop = (elem: any) => {
      var offsetTop = 0;
      do {
        if (!isNaN(elem.offsetTop)) {
          offsetTop += elem.offsetTop;
        }
      } while ((elem = elem.offsetParent));
      return offsetTop;
    };
    this.initialStickyOffset = getOffsetTop(this.filtersFormRef.nativeElement);
    // TODO : find back in Monwoo CVVideo or Ecole de la Vie how to get real div Height...
    // This height is missing margin/padding and border size....
    this.initialStickyHeight = this.filtersFormRef.nativeElement.getClientRects()[0].height + 15 * 2 + 16 * 2 + 1 * 2;
  }

  ngAfterViewChecked() {
    this.storage.ensureLockIsNotClosable();
    if (this.filtersFormRef && !this.initialStickyOffset) {
      this.initShadowStickySizes();
    }
  }

  errorHandler(err: any) {
    console.error(err);
    this.storage.setItem('moon-box-filters', this.filters.data).subscribe(() => {
      this.i18nService.get(extract('mb.boxes.notif.havingError')).subscribe(t => {
        this.notif.error('', t);
        // this.ll.hideLoader();
      });
    }, this.errorHandler);
  }

  ngAfterViewInit() {
    // filtersFormRef might be null if lockscreen activated...
    // this.initialOffset = this.filtersFormRef.nativeElement.offsetTop;
    this.boxViews.changes.subscribe((box: BoxReaderComponent) => {
      // Box did changes event (some boxes gets added to the page...)
    });
  }

  newRandomIndex() {
    let $idx = null;
    do {
      $idx = moment().format('YYYYMMDDHHmmss') + (Math.random().toString(36) + '12121212121212').slice(2, 14);
    } while (this.boxesIdxsLookup[$idx]);
    return $idx;
  }

  updateBoxesLookup() {
    this.boxesIdxsLookup = this.boxesIdxs.reduce((acc, b) => {
      acc[b] = true;
      return acc;
    }, {});
  }

  addBox() {
    // DO NOT Load/Save data with storage locked, giving empty value while it's
    // juste that the store is locked
    // Do it in if case :
    if (!this.storage.isLocked) {
      const boxId = this.newRandomIndex();
      this.boxesIdxs.push(boxId);
      this.updateBoxesLookup();
      of(() => {
        const targetBox = this.boxViews.find((item, index, src) => {
          return boxId === item.id;
        });
        targetBox.toggleConfigs(); // auto expand freshly added box
      })
        .pipe(delay(200))
        .subscribe((callback: any) => callback());

      this.storage.setItem('boxesIdxs', this.boxesIdxs).subscribe((bIdxs: string[]) => {}, this.errorHandler);
    }
  }
  async removeBox(e: any, idxToRemove: string) {
    // let boxIds = this.boxesIdxs;
    // this.boxesIdxs = []; // Remove all first, to reset component ui and avoid refresh issue box not changed

    const targetBox = this.boxViews.find((item, index, src) => {
      return idxToRemove === item.id;
    });
    // TODO : targetBox.logout(); ??
    targetBox.removeSelfStorage();
    // const boxesArrIdx = this.boxesIdxs.findIndex((b)=>idxToRemove===b);
    // if (boxesArrIdx === -1) logReview.warn('Algo bug, fail to find ' + idxToRemove, this.boxesIdxs);
    // delete this.boxesIdxs[boxesArrIdx];
    // this.boxesIdxs = [...this.boxesIdxs]; // force self updates etc.. + avoid strange bug about null value
    // delete(this.boxesIdxsLookup[idxToRemove]);
    this.boxesIdxs = this.boxesIdxs.reduce((acc, b) => {
      if (idxToRemove !== b) acc.push(b);
      return acc;
    }, []);
    this.updateBoxesLookup();
    // // this.boxViews.forEach((box: BoxReaderComponent, boxIdx: number) => {
    // const boxes = this.boxViews.map(b => b);
    // for (let boxIdx = 0; boxIdx < boxes.length; boxIdx++) {
    //   const box = boxes[boxIdx];
    //   if (boxIdx === boxes.length - 1) {
    //     await box.removeSelfStorage();
    //   } else if (boxIdx >= idxToRemove) {
    //     await box.moveSelfStorage('stepTowardEnd');
    //   }
    // }
    // boxIds.pop();
    // this.boxesIdxs = boxIds;
    await this.storage.setItem('boxesIdxs', this.boxesIdxs).subscribe((bIdxs: number[]) => {}, this.errorHandler);
  }

  toggleFilters() {
    //if (this.filtersForm.classList (this.filtersForm, 'src'))
    if (this.filtersFormRef.nativeElement.classList.contains('condensed')) {
      this.renderer.removeClass(this.filtersFormRef.nativeElement, 'condensed');
    } else {
      this.renderer.addClass(this.filtersFormRef.nativeElement, 'condensed');
    }
    this.initShadowStickySizes();
  }

  onFiltersChange() {
    if (this.filtersForm.form.valid) {
      this.storage.getItem<FormType>('moon-box-filters', {}).subscribe(filtersData => {
        (async () => {
          // Called if data is valid or null
          let freshDefaults = await formDefaults(this);
          let transforms = <FormType>shallowMerge(1, freshDefaults, filtersData);
          this.filters.data = <FormType>shallowMerge(1, transforms, this.filters.group.value);

          this.storage.setItem('moon-box-filters', this.filters.data).subscribe(() => {
            this.i18nService.get(extract('mb.boxes.notif.changeRegistred')).subscribe(t => {
              this.notif.success('', t);
              // this.ll.hideLoader();
            });
          }, this.errorHandler);

          logReview.debug('Patching Filters : ', this.filters.data);
          this.ngZone.run(() => {
            this.filters.group.patchValue(this.filters.data);
          });
        })();
      }, this.errorHandler);
    } else {
      this.storage.setItem('moon-box-filters', this.filters.data).subscribe(() => {
        this.i18nService.get(extract('mb.boxes.notif.changeFail')).subscribe(t => {
          this.notif.error('', t);
          // this.ll.hideLoader();
        });
      }, this.errorHandler);
    }
  }

  async updateForm() {
    // Load from params from local storage ? :
    if (this.filters) {
      this.storage.getItem<FormType>('moon-box-filters', {}).subscribe(
        filtersData => {
          (async () => {
            // Called if data is valid or null
            let freshDefaults = await formDefaults(this);
            this.filters.data = <FormType>shallowMerge(1, freshDefaults, filtersData);
            // transforms... ?
            let transforms = this.filters.data;
            this.filters.data = <FormType>shallowMerge(1, this.filters.data, transforms);
            logReview.debug('Patching form : ', this.filters.data);
            this.ngZone.run(() => {
              this.filters.group.patchValue(this.filters.data);
            });
          })();
        },
        error => {
          logReview.error('Fail to fetch config');
        }
      );
    } else {
      // this.filters.group.patchValue(this.filters.data);
    }
  }

  ngOnInit() {
    // this.filtersForm = this.filtersFormRef.nativeElement;
    if (this.filters) {
      // TODO : do on filters did change event...
      this.mbegKeyTransformerControl = this.filters.group.get(
        'params.moonBoxEmailsGrouping.mbegKeyTransformer'
      ) as FormArray;
      this.mbegKeyTransformerModel = this.formService.findById(
        'mbegKeyTransformer',
        this.filters.model
      ) as DynamicFormArrayModel;
    }
    this.storage.checkLockScreen();
  }

  addItem() {
    this.formService.addFormArrayGroup(this.mbegKeyTransformerControl, this.mbegKeyTransformerModel);
  }

  clear(e: any, context: DynamicFormArrayModel, index: number) {
    // console.log(e);
    // this.formService.clearFormArray(this.mbegKeyTransformerControl, this.mbegKeyTransformerModel);
    this.formService.removeFormArrayGroup(index, this.mbegKeyTransformerControl, context);
  }

  login(e: any) {
    // this.boxViews.forEach((box: BoxReaderComponent) => {
    //   box.login(event);
    // });
    this.ll.requireLoadingLock(); // TODO : add services to listen to time outed lock ? => cancelling all current tasks if loading lock did time out ?
    logReview.debug('Sarting multi-login');

    return from(this.boxViews.toArray())
      .pipe(
        concatMap((box: BoxReaderComponent, idx) => {
          return box.login(e);
        })
      )
      .pipe(
        tap(loadedBoxes => {
          logReview.debug('Did login for all boxes', loadedBoxes);
          this.ll.releaseLoadingLock();
        }),
        catchError((e, c) => {
          this.ll.releaseLoadingLock();
          throw e;
        })
      );
  }
  loadNext(e: any) {
    // this.boxViews.forEach((box: BoxReaderComponent) => {
    //   box.loadNext(e);
    // });
    this.ll.requireLoadingLock(); // TODO : add services to listen to time outed lock ? => cancelling all current tasks if loading lock did time out ?
    logReview.debug('Sarting multi-next queries');

    // TODO : may have buggy conception design : seem to loop infinitly on errors....

    return from(this.boxViews.toArray())
      .pipe(
        concatMap((box: BoxReaderComponent, idx) => {
          return box.loadNext(e);
        })
      )
      .pipe(
        tap(loadedMessages => {
          logReview.debug('Did fetch next messages for all boxes', loadedMessages);
          this.ll.releaseLoadingLock();
        }),
        catchError((e, c) => {
          this.ll.releaseLoadingLock();
          throw e;
        })
      );
  }
  expandBoxesConfigs = true;
  toggleBoxesConfigs(e: any) {
    this.expandBoxesConfigs = !this.expandBoxesConfigs;
    return this.localStorage.setItem('expand-boxes-configs', this.expandBoxesConfigs);
  }

  msgsOpenedIdx = {};
  expandMessages(e: any, k: string, idx: number) {
    if (this.isMsgsCondensed(idx)) {
      this.msgsOpenedIdx[idx] = true;
    } else {
      this.msgsOpenedIdx[idx] = false;
    }
  }
  _isMsgsCondensed = true;
  isMsgsCondensed(idx: number) {
    this._isMsgsCondensed = !this.msgsOpenedIdx[idx];
    return this._isMsgsCondensed;
  }
  msgOpenedIdx = {};
  expandMessage(e: any, k: string, idx: number) {
    if (this.isMsgCondensed(idx)) {
      this.msgOpenedIdx[idx] = true;
      // TODO : refactor to put iframe refresh in backend service; ok for now :
      // this.boxViews.first.updateIFrames();
      this.updateIFrames();
    } else {
      this.msgOpenedIdx[idx] = false;
    }
  }
  _isMsgCondensed = true;
  isMsgCondensed(idx: number) {
    this._isMsgCondensed = !this.msgOpenedIdx[idx];
    return this._isMsgCondensed;
  }

  @HostListener('window:message', ['$event'])
  htmlMsgListener(e: any) {
    let data = e.data;
    let dfrom = data.from;
    if ('IFrameLoading' === dfrom) {
      if (this.allIFrames[data.to]) {
        logReview.debug('Having iframe height : ', e);
        this.ngZone.run(() => {
          // Need to run on angular side to allow element resize ?
          this.allIFrames[data.to].height = data.height; //+ "px";
        });
      } else {
        logReview.debug('Having refresh from cleaned iframe', e);
      }
    }
  }

  frameIdx = 0;
  isProcessingIFrames = false;
  allIFrames = {};
  public updateIFrames() {
    if (this.isProcessingIFrames) {
      // logReview.debug('Frame updates already in process, postponing action');
      of(() => {
        this.updateIFrames();
      })
        .pipe(delay(500))
        .subscribe((callback: any) => callback());
      return;
    }
    this.isProcessingIFrames = true;
    of(() => {
      this.allIFrames = {};
      let iframes = document.querySelectorAll('iframe[data-didload="0"]');
      if (!iframes.length) {
        this.isProcessingIFrames = false;
        return;
      }
      from(iframes) // TODO : refactor and bundle down in backend.service => Async Worker Stack design pattern
        .pipe(
          delay(1000),
          tap((f: HTMLIFrameElement) => {
            this.frameIdx++;
            this.allIFrames[this.frameIdx] = f;
            // this.renderer.setAttribute(f, 'src', f.getAttribute('data-src'));
            const target = environment.moonBoxBackendUrl + '/api/iframe';
            if (!parseInt(f.getAttribute('data-didLoad'))) {
              // https://stackoverflow.com/questions/22194409/failed-to-execute-postmessage-on-domwindow-the-target-origin-provided-does/40000073
              f.setAttribute('src', target);
              f.setAttribute('data-index', '' + this.frameIdx);
              f.onload = e => {
                logReview.debug('IFrame src did load : ', target);
                // iFrame.width  = iFrame.contentWindow.document.body.scrollWidth;
                // Ajusting content height :
                // Bad : Having CORS issue => need to work in iframe injector to solve it...
                // https://benohead.com/cross-document-communication-with-iframes/
                // https://stackoverflow.com/questions/23362842/access-control-allow-origin-not-working-for-iframe-withing-the-same-domain
                // https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy#Changing_origin
                // f.height = "1000px";
                // Still having cors issue with (even with domain set => need iframe allow CORS ? how to specific domain allow ?) :
                // f.height = f.contentWindow.document.body.scrollHeight + "px";

                (async () => {
                  f.contentWindow.postMessage(
                    {
                      endpoint: f.getAttribute('data-src'),
                      // 'credentials': await this.storage
                      // .getItem<any>('access_token').toPromise(),
                      credentials: await this.localStorage.getItem<any>('access_token').toPromise(),
                      post: {
                        username: decodeURIComponent(f.getAttribute('data-username'))
                      },
                      index: this.frameIdx,
                      domain: environment.moonBoxFrontendDomain,
                      url: environment.moonBoxFrontendUrl
                    },
                    target
                  );
                })();
              };
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
}

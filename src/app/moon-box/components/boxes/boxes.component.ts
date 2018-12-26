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
import { pluck, delay, last, tap } from 'rxjs/operators';
import { forkJoin, of, from } from 'rxjs';
import { LocalStorage } from '@ngx-pwa/local-storage';

import { shallowMerge } from '@moon-manager/tools';
import { NotificationsService } from 'angular2-notifications';
import { extract } from '@app/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { BoxReaderComponent } from '@moon-box/components/box-reader/box-reader.component';
import { Logger } from '@app/core/logger.service';
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

  constructor(
    private i18nService: I18nService,
    private formService: DynamicFormService,
    public storage: SecuStorageService,
    private localStorage: LocalStorage,
    private ngZone: NgZone,
    private notif: NotificationsService,
    public eltRef: ViewContainerRef,
    private rendererFactory: RendererFactory2,
    public msgs: MessagesService
  ) {
    (async () => {
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

  login(event: any) {
    this.boxViews.forEach((box: BoxReaderComponent) => {
      box.login(event);
    });
  }
  loadNext(e: any) {
    this.boxViews.forEach((box: BoxReaderComponent) => {
      box.loadNext(e);
    });
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

  isProcessingIFrames = false;
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
      let iframes = document.querySelectorAll('iframe[data-didload="0"]');
      if (!iframes.length) {
        this.isProcessingIFrames = false;
        return;
      }
      from(iframes) // TODO : refactor and bundle down in backend.service => Async Worker Stack design pattern
        .pipe(
          delay(1000),
          tap((f: HTMLIFrameElement) => {
            // this.renderer.setAttribute(f, 'src', f.getAttribute('data-src'));
            const target = environment.moonBoxBackendUrl + '/api/iframe';
            if (!parseInt(f.getAttribute('data-didLoad'))) {
              // https://stackoverflow.com/questions/22194409/failed-to-execute-postmessage-on-domwindow-the-target-origin-provided-does/40000073
              f.setAttribute('src', target);
              f.onload = e => {
                logReview.debug('IFrame src did load : ', target);
                (async () => {
                  f.contentWindow.postMessage(
                    {
                      endpoint: f.getAttribute('data-src'),
                      // 'credentials': await this.storage
                      // .getItem<any>('access_token').toPromise(),
                      credentials: await this.localStorage.getItem<any>('access_token').toPromise(),
                      post: {
                        username: decodeURIComponent(f.getAttribute('data-username'))
                      }
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

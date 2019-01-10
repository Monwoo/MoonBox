// Copyright Monwoo 2018-2019, made by Miguel Monwoo, service@monwoo.com

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
  ViewChildren,
  ChangeDetectionStrategy,
  SimpleChanges,
  OnChanges
} from '@angular/core';
import { NgForm, FormArray, Validators, FormBuilder } from '@angular/forms';
import {
  FormType,
  FORM_LAYOUT,
  formDefaults,
  ContextType,
  contextDefaults,
  filtersInitialState
} from './filters-form.model';
import { I18nService } from '@app/core';
import {
  DynamicFormArrayModel,
  DynamicFormGroupModel,
  DynamicFormService,
  DynamicInputModel
} from '@ng-dynamic-forms/core';
// import { LocalStorage } from '@ngx-pwa/local-storage';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';
import { MessagesService } from '@moon-box/services/messages.service';
import {
  debounceTime,
  delay,
  last,
  map,
  tap,
  startWith,
  concatMap,
  mergeAll,
  mergeMap,
  withLatestFrom,
  combineLatest,
  combineAll,
  concatAll,
  catchError,
  share,
  debounce,
  filter,
  finalize,
  zip,
  auditTime,
  audit,
  concatMapTo,
  distinctUntilChanged
} from 'rxjs/operators';
import {
  fromEvent,
  of,
  from,
  BehaviorSubject,
  forkJoin,
  interval,
  Observable,
  combineLatest as combineLatestFrom,
  Subscription,
  ReplaySubject
} from 'rxjs';
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

export class UpdateSubject extends BehaviorSubject<boolean> {
  public status = false;
  constructor(init: boolean) {
    super(init);
    this.pipe(
      tap(status => {
        this.status = status;
      })
    );
  }
}

// export class HandlerSubject extends ReplaySubject<void> {
export class HandlerSubject extends BehaviorSubject<void> {
  // public transforms: any = null;
  public countRequests: number = 0;
  handle(caller: BoxesComponent, transforms: any) {
    // return forkJoin([this.pipe(
    return this.pipe(
      tap(() => {
        if (this.countRequests) {
          logReview.warn('Too many requesting filters form update', 'TODO : try to avoid...');
        } else {
          logReview.debug('Requesting filters form update');
        }
        this.countRequests++;
      }),
      // https://www.learnrxjs.io/operators/transformation/switchmap.html ?
      // https://www.learnrxjs.io/operators/filtering/skipuntil.html
      // https://www.learnrxjs.io/operators/filtering/audittime.html
      // debounceTime(500), // avoid multiple updates for focus/change/blur on checkmark checked...
      // debounce(() => caller.isFormUpdating$), // TODO : debounce until lock released...
      // auditTime(500), // avoid multiple updates for focus/change/blur on checkmark checked...
      audit(() => caller.isFormUpdating$), // TODO : debounce until lock released...
      map(() => {
        caller.isFormUpdating$.next(true);
        logReview.debug('Starting debounced filters form update');
        const self = caller;
        const resp = caller.storage.getItem<FormType>('moon-box-filters', filtersInitialState(caller)).pipe(
          tap(filtersData => {
            logReview.debug('Reading filters from storage : ', filtersData);
          }),
          // map(f => of(f)),
          // https://github.com/Reactive-Extensions/RxJS/issues/1437
          // https://stackoverflow.com/questions/47052977/withlatestfrom-does-not-emit-value
          // https://gist.github.com/whiteinge/9dab34105233871f3d660d9b1056a7ad
          // https://www.learnrxjs.io/operators/combination/withlatestfrom.html
          combineLatest(
            //concatMapTo(
            // withLatestFrom(
            // forkJoin([
            // interval(1000).pipe(
            //   tap(defaultF => {
            //     logReview.debug('LatestFrom OK');
            //   })
            // )
            // ])
            from(contextDefaults(caller)).pipe(
              tap(defaultF => {
                logReview.debug('Having filters defaults : ', defaultF);
              })
            )
            // [from([formDefaults(caller)]).pipe(
            //   concatMap(p => p),
            //   // mergeAll(), // concatAll(), //
            //   tap(defaultF => {
            //     logReview.debug('Having filters defaults : ', defaultF);
            //   })
            // )]
          ),
          // mergeAll(),
          // map(([filtersData, defaultsPromise]) => [filtersData, forkJoin([defaultsPromise])]),
          map(([filtersData, freshDefaults]) => {
            // TODO : caller not linked to caller class, why only here ? (when using forkJoin, may be typo of old code ?)
            freshDefaults.data = <FormType>shallowMerge(1, freshDefaults.data, filtersData);
            if (transforms) {
              freshDefaults.data = <FormType>shallowMerge(1, freshDefaults.data, transforms);
            }
            // Done in msgs.service listener of MessagesService on property setter :
            // caller.msgs.shouldKeepMsgsInMemory(freshDefaults.data.keepMessagesInMemory);
            // caller.msgs.shouldKeepMsgsInMemory = (<FormType>freshDefaults.group.value).keepMessagesInMemory;
            caller.msgs.shouldKeepMsgsInMemory = freshDefaults.data.keepMessagesInMemory;
            // TODO : need to Await ng Zone if using it ? :
            self.ngZone.run(() => {
              logReview.debug('Patching filters form : ', freshDefaults.data);
              freshDefaults.group.patchValue(freshDefaults.data);
              // freshDefaultsForm = freshDefaultsFormRef.nativeElement;
              // TODO : do on filters did change event...
              self.mbegKeyTransformerControl = freshDefaults.group.get(
                'params.moonBoxEmailsGrouping.mbegKeyTransformer'
              ) as FormArray;
              self.mbegKeyTransformerModel = self.formService.findById(
                'mbegKeyTransformer',
                freshDefaults.model
              ) as DynamicFormArrayModel;
            });
            self.filters = freshDefaults; // This one will trigger box-reader onFilters change event
            logReview.debug('Finishing filters transforms : ', self.filters.data);
            return self.filters.data;
          }),
          tap(filtersData => {
            logReview.debug('Release form filter update lock');

            // TODO : monitor :
            // self.filters.group.value
            // => since will change on multiple input text edit, opposit to material (change) HandlerSubject....
            // https://stackoverflow.com/questions/38571812/how-to-detect-when-an-input-value-changes-in-angular
            // https://stackoverflow.com/questions/42971865/angular2-zone-run-vs-changedetectorref-detectchanges
            // https://stackoverflow.com/questions/34796901/angular2-change-detection-ngonchanges-not-firing-for-nested-object
            // https://angular.io/guide/lifecycle-hooks#docheck

            // https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Object/observe
            // https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Objets_globaux/Proxy
            /* maybe setValue is a copy wiping out Proxy ? well, not in sync with @input of box-reader, having change on list updates
            var handler = {
              get: function(obj:any, prop:string){
                return prop in obj ? obj[prop] : undefined;
              },
              set: function(obj:any, prop:string, valeur:any) {
                logReview.debug('Filters value gets update', prop, valeur);
                obj[prop] = valeur;
                return true;
              },
            };
          
            // self.filters.group.value = new Proxy(self.filters.group.value, handler);
            self.filters.group.setValue(new Proxy(self.filters.group.value, handler));
            */

            caller.updateFormHandler$.countRequests = 0;
            caller.isFormUpdating$.next(false);
            caller.updateFormHandler$.complete(); // Try to trigger subscriber complet result
          })
          // finalize(() => { // Why this code is not called ??
          //   logReview.debug('Release form filter finalize update lock');
          //   caller.isFormUpdating$.next(false);
          // })
        );
        return resp;
      }),
      mergeMap((input: Observable<FormType>, idx: number) => {
        logReview.debug('Filters mergeMap call', idx);
        return input;
      })
      // concatMap((input: Observable<FormType>, idx: number) => {
      //   logReview.debug('Filters concatMap call', idx);
      //   return input;
      // })
      // combineLatest(),
      // mergeAll(),
      // https://www.learnrxjs.io/operators/combination/zip.html
      // zip(),
      // http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html#static-method-combineLatest
      // http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html#instance-method-combineAll
      // http://reactivex.io/rxjs/class/es6/Observable.js~Observable.html#instance-method-concatAll
      // concatMap((in:any, idx:number) => { // forkJoin needed for it ? => too much line of code to write...
      //   return of(in);
      // }),
      // finalize(() => { // Why this code is not called ??
      //   logReview.debug('Release form filter update lock');
      //   caller.isFormUpdating$.next(false);
      // })
    ); // .subscribe();
  }
}

@Component({
  selector: 'moon-boxes',
  templateUrl: './boxes.component.html',
  styleUrls: ['./boxes.component.scss'],
  // https://dzone.com/articles/how-to-use-change-detection-in-angular
  // https://www.toptal.com/angular/angular-change-detection
  // https://blog.angular-university.io/onpush-change-detection-how-it-works/
  changeDetection: ChangeDetectionStrategy.OnPush, // Not enough to force update on Input Multiple Word add..
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
export class BoxesComponent implements OnInit, OnChanges {
  // @ViewChild('filtersForm') filtersForm: ElementRef<NgForm> = null;
  @ViewChild('filtersFormRef') filtersFormRef: ElementRef<HTMLFormElement> = null;
  @ViewChild('filtersForm') filtersForm: NgForm = null; // TODO : refactor => ref is already inside this.filters...
  @ViewChild('stickyContainer') stickyContainer: ElementRef<HTMLDivElement> = null;
  @ViewChildren(BoxReaderComponent) boxViews!: QueryList<BoxReaderComponent>;

  isSticky: boolean = false;
  initialStickyOffset: number = 0;
  initialStickyHeight: number = 0;

  // Export only for HandlerSubject to use it... ? protected for now...
  protected filtersFormChanges: MutationObserver = null;
  // https://stackoverflow.com/questions/34796901/angular2-change-detection-ngonchanges-not-firing-for-nested-object
  // https://angular.io/guide/lifecycle-hooks#docheck
  ngOnChanges(changes: SimpleChanges) {
    // { [propName: string]: SimpleChange }) {
    logReview.debug('ngOnChanges = ', changes);
  }

  preventDefault(e: any) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    return false;
  }

  @HostListener('document:click', ['$event'])
  clickout(event: any) {
    if (!this.isSticky) {
      return; // ignoring in no sticky effect
    }
    if (this.stickyContainer.nativeElement.contains(event.target)) {
      // ok, inside sticky click
    } else {
      // if expanded, need to collapse : => no collapse on sticky anymore, only Actions btn
      // if (this.haveExpandedFilters) {
      //   this.toggleFilters();
      // }
    }
  }

  @HostListener('window:scroll', ['$event'])
  checkScroll() {
    // if (this.innerWidth < this.size.md) {
    //   return; // ignoring sticky effect for mobile devices
    // }

    if (!this.stickyContainer) return; // will waith for sticky to be displayed
    const deltaScrollAvailable = document.body.scrollHeight - document.body.clientHeight;

    this.isSticky = window.pageYOffset >= this.initialStickyOffset && deltaScrollAvailable > 200;

    // TODO : refactor with listener on sticky event system ?
    // this.lastScrollPos = 0; // do not scroll back if he start scrolling ?

    // this.stickyContainer.nativeElement.getBoundingClientRect().bottom;
    // if (this.isSticky) {
    //   this.stickyContainer.nativeElement.parentElement.parentElement.style.marginTop = this.initialStickyHeight + 'px';
    // } else {
    //   this.stickyContainer.nativeElement.parentElement.parentElement.style.marginTop = '0px';
    // }
  }
  @HostListener('submit', ['$event'])
  onSubmit(e: any) {
    // https://github.com/udos86/ng-dynamic-forms/blob/ae2ee717cc8e1861d02ac38dbe259517d43d91a5/packages/ui-material/src/dynamic-material-form.component.ts
    // https://github.com/udos86/ng-dynamic-forms/blob/ae2ee717cc8e1861d02ac38dbe259517d43d91a5/packages/core/src/component/dynamic-form-component.ts
    // https://github.com/udos86/ng-dynamic-forms/blob/ae2ee717cc8e1861d02ac38dbe259517d43d91a5/packages/ui-material/src/input/dynamic-material-input.component.ts
    // https://github.com/udos86/ng-dynamic-forms/blob/7d9d30ab1dd08b299ab527244a8479053a6c1204/packages/core/src/model/input/dynamic-input.model.ts
    // https://github.com/udos86/ng-dynamic-forms/search?p=4&q=%22.multiple%22&unscoped_q=%22.multiple%22
    // https://github.com/udos86/ng-dynamic-forms/blob/ae2ee717cc8e1861d02ac38dbe259517d43d91a5/packages/ui-basic/src/input/dynamic-basic-input.component.html
    // https://github.com/udos86/ng-dynamic-forms/blob/f9d1da46a2daa687a011f3bd352b00694216b070/packages/ui-material/src/chips/dynamic-material-chips.component.html
    // https://github.com/udos86/ng-dynamic-forms/blob/ae2ee717cc8e1861d02ac38dbe259517d43d91a5/packages/ui-material/src/dynamic-material-form-control-container.component.ts
    // https://github.com/udos86/ng-dynamic-forms/blob/5389c2bd617b870f50ac6cd1e6d9cc0773afb48c/packages/ui-material/src/chips/dynamic-material-chips.component.spec.ts
    // https://github.com/udos86/ng-dynamic-forms/blob/5389c2bd617b870f50ac6cd1e6d9cc0773afb48c/packages/ui-material/src/chips/dynamic-material-chips.component.ts
    // https://github.com/udos86/ng-dynamic-forms/search?q=onChipInputTokenEnd&unscoped_q=onChipInputTokenEnd
    // https://github.com/udos86/ng-dynamic-forms/blob/f9d1da46a2daa687a011f3bd352b00694216b070/packages/ui-material/src/chips/dynamic-material-chips.component.ts
    // https://github.com/udos86/ng-dynamic-forms/blob/f9d1da46a2daa687a011f3bd352b00694216b070/packages/ui-material/src/chips/dynamic-material-chips.component.html
    // https://stackoverflow.com/questions/1249531/how-to-get-a-javascript-objects-class

    /*
    Play with Google Chrome webconsole :
    inputWithMultiples = {'keywordsSubject':true, 'keywordsBody':true};
    m = this.filters.model.find(m => m.id === 'params').group.find(m => m.id in inputWithMultiples && inputWithMultiples[m.id]);
    Object.keys(m).map(k => k.constructor ? k.constructor.name : null)
    
    */

    // https://github.com/udos86/ng-dynamic-forms/blob/5389c2bd617b870f50ac6cd1e6d9cc0773afb48c/packages/ui-material/src/chips/dynamic-material-chips.component.ts
    // https://github.com/udos86/ng-dynamic-forms/blob/ae2ee717cc8e1861d02ac38dbe259517d43d91a5/packages/core/src/component/dynamic-form-control.component.ts
    // https://github.com/udos86/ng-dynamic-forms/blob/ae2ee717cc8e1861d02ac38dbe259517d43d91a5/packages/core/src/component/dynamic-form-control.interface.ts

    // Ajusting Multiple textFields Possible not handled submission of switch Input events
    // TODO : find a way to call DynamicMaterialChipsComponent.onChipInputTokenEnd(e) to remove 'hackyMultiple'
    // const inputWithMultiples = {'keywordsSubject':true, 'keywordsBody':true};
    // this.filters.model.find(m => m.id in inputWithMultiples && inputWithMultiples[m.id])

    if (!this.filtersForm.form.valid) {
      let target;
      for (var i in this.filtersForm.form.controls) {
        // need to check errors since did use 'setError' method from login action on bad user ids ?
        // TODO : remove below hack, avoiding tricky case for now :
        if ('_username' === i) {
          continue;
        }
        if (!this.filtersForm.form.controls[i].valid) {
          target = this.filtersForm.form.controls[i];
          break;
        }
      }
      if (target) {
        // https://stackoverflow.com/questions/41173027/angular-2-focus-on-first-invalid-input-after-click-event
        // https://stackoverflow.com/questions/43553544/how-can-i-manually-set-an-angular-form-field-as-invalid
        // $('html,body').animate({scrollTop: $(target.nativeElement).offset().top}, 'slow');
        // logReview.debug(target);
        target.markAsTouched(); // TODO : unlike in box-reader login form, markAsTouched have no effet when injecting items in form...
        if (!this.haveExpandedFilters) {
          this.toggleFilters();
        }
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
        // this.clickOnRemoveAgregationQuickHack = true; // TODO : dose above stopPropagation have no effect ?
        return false;
      }
    }
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

  inputWithMultiples = { keywordsSubject: true, keywordsBody: true };

  constructor(
    private i18nService: I18nService,
    public formService: DynamicFormService,
    public storage: SecuStorageService,
    private localStorage: LocalStorage,
    public ngZone: NgZone,
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

    this.renderer = this.rendererFactory.createRenderer(null, null);
    this.storage.setLockContainer(this.eltRef);
    this.storage.onUnlock.subscribe(() => {
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

        // No need to start with fresh default since 'UpdateForm' will ovewrite it
        // this.filters = await contextDefaults(this); // This one will trigger box-reader onFilters change event
        /*
        Object.keys(this.inputWithMultiples).forEach(k => {
          let m = <DynamicInputModel>
          (<DynamicFormGroupModel>this.filters.model.find(m => m.id === 'params'))
          .group.find(m => m.id === k);
  
          m.valueUpdates.subscribe(v => {
            logReview.debug("Having Input as Multiple update", v); // Wrong way, do not seem to be called...
          });
        });
        */

        this.refreshBoxesIdxs();
        await this.updateForm().toPromise();
      })();
    });
    // Doing form update on messages changes have no meanings
    // since filters dose not depend on it
    // + will help avoid multi call issue (debounce is not right opérator => should cancel,
    // but what if cancel happen in middle of data save ??? => possible data issue
    // so will need to implement this kind of feature with better software design and unit-testings...)
    // this.msgs.service.subscribe(messages => {
    //   // need to update form model to update formfields suggestions
    //   // TODO : better form design pattern to handle all that in simple form codes...
    //   // formModel(this).then(model => {
    //   //   this.filters.model = model;
    //   // });
    //   (async () => {
    //     await this.updateForm().toPromise();
    //   })();
    // });
    // UpdateForm will be done only once on unlock (only reason to reload form since user data or session did change)
    // this.updateForm().subscribe();
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

  lastScrollPos = 0;
  scrollInterval: any = null;

  scrollTop(e: any) {
    // RxJs Way ?
    if (this.scrollInterval) {
      window.clearInterval(this.scrollInterval);
    }
    this.lastScrollPos = window.pageYOffset;
    this.scrollInterval = window.setInterval(() => {
      const pos = window.pageYOffset;
      let delta = pos - this.lastScrollPos * 0.2;
      if (delta > 0) {
        window.scrollTo(0, delta); // how far to scroll on each step
      } else {
        window.scrollTo(0, 0);
        window.clearInterval(this.scrollInterval);
        this.scrollInterval = null;
        // TODO : why listener not called ? it do not stick back anymore ...
        // => Well, it works, was a double call to checkSroll somewhere else the buggy stuff...
        // this.checkScroll();
      }
    }, 16);
    // Try to avoid other expand actions :
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    return false;
  }

  scrollBackDown(e: any) {
    // this.hackIsGoingDown = true; // start hacky code

    // TODO V2 : link to user history : allow him to scroll back
    // to all positions he previously scroll up
    // => need ergonomie study : may need new btn ? already too much btns...

    // RxJs Way ?
    if (this.scrollInterval) {
      window.clearInterval(this.scrollInterval);
    }
    this.scrollInterval = window.setInterval(() => {
      const pos = window.pageYOffset;
      let delta = pos > this.lastScrollPos ? pos - this.lastScrollPos * 0.2 : pos + this.lastScrollPos * 0.2;
      if (
        (pos > this.lastScrollPos && delta < this.lastScrollPos) ||
        (pos < this.lastScrollPos && delta > this.lastScrollPos)
      ) {
        window.scrollTo(0, delta); // how far to scroll on each step
      } else {
        window.scrollTo(0, this.lastScrollPos);
        window.clearInterval(this.scrollInterval);
        this.lastScrollPos = 0;
      }
    }, 16);
    // Try to avoid other expand actions :
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    return false;
  }

  refreshBoxesIdxs() {
    this.storage.setupStorage('lvl2'); // TODO: why need to set lvl 2, need better storage design pattern...
    this.storage.getItem('boxesIdxs').subscribe((bIdxs: string[]) => {
      if (bIdxs) {
        this.boxesIdxs = bIdxs;
      } else {
        this.boxesIdxs = [];
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
    // TODO : buggy offset top...
    this.initialStickyOffset = getOffsetTop(this.stickyContainer.nativeElement);
    // TODO : find back in Monwoo CVVideo or Ecole de la Vie how to get real div Height...
    // This height is missing margin/padding and border size....
    this.initialStickyHeight = this.stickyContainer.nativeElement.getClientRects()[0].height + 15 * 2 + 16 * 2 + 1 * 2;
  }

  /*
  WARNING : be carful with ngAfterViewChecked => avoid front updates, may get 
  error of refreshing data already locked for rendreing.....
  */
  ngAfterViewChecked() {
    this.storage.ensureLockIsNotClosable();
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

  private viewInitProgressiveDelay = 100;
  ngAfterViewInit() {
    const initHandler = () => {
      logReview.assert(!!this.stickyContainer, 'Fail to load sticky container');
      logReview.debug('Will init boxes views');
      this.initShadowStickySizes();

      // filtersFormRef might be null if lockscreen activated...
      // this.initialOffset = this.stickyContainer.nativeElement.offsetTop;
      this.boxViews.changes.subscribe((box: BoxReaderComponent) => {
        // Box did changes event (some boxes gets added to the page...)
      });

      // https://www.bennadel.com/blog/2955-watching-and-responding-to-ngmodel-changes-in-angularjs.htm
      // https://blog.bitsrc.io/event-binding-mechanism-in-angular-b38f0e46d2ed
      if (this.filtersFormChanges) {
        // Disconnect previous observer
        this.filtersFormChanges.disconnect();
      }
      // https://nitayneeman.com/posts/listening-to-dom-changes-using-mutationobserver-in-angular/
      // https://stackoverflow.com/questions/49552258/how-to-listen-for-value-changes-from-class-property-typescript-angular
      this.filtersFormChanges = new MutationObserver((mutations: MutationRecord[]) => {
        mutations.forEach((mutation: MutationRecord) => {
          // console.debug('Mutation record fired', mutation);
          // logReview.debug('Mutation record fired', mutation);
          // logReview.debug(
          //   `Attribute '${mutation.attributeName}' changed to value `,
          //   (<any>mutation.target).attributes[mutation.attributeName].value
          // );
        });
      });
      // Here we start observer to work with that element
      // MutationObserver => only for object of type node... :
      // self.filtersFormChanges.observe(self.filters.group.value, {
      this.filtersFormChanges.observe(this.filtersFormRef.nativeElement, {
        attributes: true,
        childList: true,
        characterData: true
      });

      // TODO : quick hack for now since fail to setup autocomplete off on DatePicker Model
      var inputs = this.filtersFormRef.nativeElement.querySelectorAll('input');
      inputs.forEach(input => {
        input.setAttribute('autocomplete', 'off');
      });
    };
    if (this.storage.isLocked || !this.stickyContainer) {
      this.viewInitProgressiveDelay *= 2;
      logReview.debug('Postponing boxes filters update');
      return of(true)
        .pipe(delay(this.viewInitProgressiveDelay))
        .pipe(
          // map(_ => (initHandler())),
          tap(() => {
            this.ngAfterViewInit();
          })
        )
        .subscribe();
    } else {
      this.viewInitProgressiveDelay = 100;
      initHandler();
    }
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
    if (this.boxViews) {
      this.boxViews.notifyOnChanges();
    } else {
      logReview.debug('TODO ? : ok to do nothing on empty boxViews ?');
    }
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
    await this.storage.setItem('boxesIdxs', this.boxesIdxs).subscribe((bIdxs: string[]) => {}, this.errorHandler);
  }

  haveExpandedFilters = false;
  // DONE : refactor design... remove hack
  // hackIsGoingDown = false;
  toggleFilters() {
    // Below hack solved by using JS PreventDefault event :
    // if (this.isSticky) {
    //   return; // ignore filters expands on sticky mode
    // }
    // if (this.hackIsGoingDown) {
    //   this.hackIsGoingDown = false; // consume hacky code
    //   return; // ignore filters expands on going back down
    // }

    //if (this.filtersForm.classList (this.filtersForm, 'src'))
    this.haveExpandedFilters = !this.haveExpandedFilters;
    // this.filtersFormRef.nativeElement.classList.contains('condensed')
    if (this.haveExpandedFilters) {
      this.renderer.removeClass(this.filtersFormRef.nativeElement, 'condensed');
    } else {
      this.renderer.addClass(this.filtersFormRef.nativeElement, 'condensed');
    }
    // this.initShadowStickySizes();
  }

  onFiltersChange(e: any, t: any = null) {
    // Nghost event not already detected ? TODO : avoid quick fix below :
    this.onSubmit(e);

    // TODO : Switching Password and Msgs save indicator as Btn or only keep as indicator ?
    // => Work on colors meanings => Mail Actions / Mail Indicator having Actions (actif/inactif) /

    (async () => {
      if (this.filtersForm.form.valid) {
        // Wrong to have multiple subscribe this way, better use promise and await :
        // this.updateForm(this.filtersForm.form.value).subscribe(filtersData => {
        //   logReview.debug('Having updated form data : ', filtersData);
        //   this.storage.setItem('moon-box-filters', filtersData).subscribe(() => {
        //     this.i18nService.get(extract('mb.boxes.notif.changeRegistred')).subscribe(t => {
        //       this.notif.success('', t);
        //       // this.ll.hideLoader();
        //     });
        //   }, this.errorHandler);
        // }, this.errorHandler);
        const filtersData = await this.updateForm(t ? t : this.filtersForm.form.value).toPromise();
        logReview.debug('Having updated form data : ', filtersData);
        if (!filtersData.keepMessagesInMemory) {
          this.msgs.clearMessages(); // Need to manually clear msgs since ensure Memory do not contains messages, but keep local front in case user switch back to save Msgs actions after some load
        }
        await this.storage.setItem('moon-box-filters', filtersData);
        this.i18nService.get(extract('mb.boxes.notif.changeRegistred')).subscribe(t => {
          this.notif.success('', t);
          // this.ll.hideLoader();
        });
      } else {
        // this.storage.setItem('moon-box-filters', filtersData).subscribe(() => {
        this.i18nService.get(extract('mb.boxes.notif.changeFail')).subscribe(t => {
          this.notif.error('', t);
          // this.ll.hideLoader();
        });
        // }, this.errorHandler);
        return false; // Stop propagation is already done with this.onSubmit(e);
      }
    })();
  }

  onMatEvent(e: any) {
    logReview.debug(`Material ${e.type} event on: ${e.model.id}: `, e);
  }

  // https://github.com/ReactiveX/rxdart/issues/128
  // https://stackoverflow.com/questions/38739499/anonymous-class-instance-is-it-a-bad-idea
  isFormUpdating$ = <UpdateSubject>new UpdateSubject(false).pipe(
    distinctUntilChanged(), // only emit on values changes
    filter(status => !status) // only keep isFormUpdating false events
  );

  public get isFormUpdating(): boolean {
    logReview.debug('Get form Updating', this.isFormUpdating$.status);
    return this.isFormUpdating$.status;
  }

  public set isFormUpdating(v: boolean) {
    logReview.debug('Set form Updating', v);
    this.isFormUpdating$.next(v);
  }

  // progressiveDelay = 100; // Used to avoid too much back calls on infinit fails...
  // private updateFormSubcriber: Subscription = null;
  updateFormHandler$: HandlerSubject = null;
  updateForm(transforms: any = null) {
    // if (this.updateFormSubcriber) {
    //   this.updateFormSubcriber.unsubscribe();
    // }
    // this.updateFormSubcriber = this.updateFormHandler$.handle(this, transforms);

    // const isSettingUpHandler = !this.updateFormHandler$;
    // if (isSettingUpHandler) {
    //   this.updateFormHandler$ = new HandlerSubject();
    // }
    // Rebuilding subject on each updateForm, to keep only One emitted value for all listeners
    // To this update form event
    this.updateFormHandler$ = new HandlerSubject(undefined);
    const updateForm$ = this.updateFormHandler$.handle(this, transforms);
    // this.updateFormHandler$.complete(); => all gets postpowned if using complete here
    // if (!isSettingUpHandler) {
    //   this.updateFormHandler$.next();
    // }

    //formUpdateSubcriber: Subscription = null;
    // https://stackblitz.com/edit/angular-kgppaa?file=src%2Fapp%2Fapp.component.html
    // https://github.com/udos86/ng-dynamic-forms/issues/774
    // https://github.com/udos86/ng-dynamic-forms/blob/f9d1da46a2daa687a011f3bd352b00694216b070/sample/app/ui-material/material-sample-form.component.html
    //
    // TODO ? : rewrite using takeUntil etc ... ?
    // https://medium.com/@benlesh/rxjs-dont-unsubscribe-6753ed4fda87
    // https://medium.com/the-geeks-of-creately/cancelling-observables-rxjs-f4cf28c3b633
    // https://www.learnrxjs.io/operators/filtering/filter.html
    return updateForm$;
  }

  ngOnInit() {
    this.storage.checkLockScreen();
  }

  addFilterAgregation(e: any) {
    this.formService.addFormArrayGroup(this.mbegKeyTransformerControl, this.mbegKeyTransformerModel);
    this.onFiltersChange(e); // TODO : why not auto-call by material component ?
  }

  removeFilterAgregation(e: any, context: DynamicFormArrayModel, index: number) {
    // console.log(e);
    // this.formService.clearFormArray(this.mbegKeyTransformerControl, this.mbegKeyTransformerModel);
    this.formService.removeFormArrayGroup(index, this.mbegKeyTransformerControl, context);
    this.onFiltersChange(e); // TODO : why not auto-call by material component ?
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    // this.clickOnRemoveAgregationQuickHack = true; // TODO : dose above stopPropagation have no effect ?
    return false;
  }

  login(e: any) {
    // this.boxViews.forEach((box: BoxReaderComponent) => {
    //   box.login(event);
    // });
    this.ll.requireLoadingLock(); // TODO : add services to listen to time outed lock ? => cancelling all current tasks if loading lock did time out ?
    logReview.debug('Sarting multi-login');

    // return combineLatestFrom(from(this.boxViews.toArray()).pipe( // Not waiting for all to finish before emitting...
    // Waiting for all, but not order dependency maintened (all login trigers in //, need sequential) :
    // return combineLatestFrom(...this.boxViews.toArray().map(box => {
    //   return box.login(e);
    // }))
    return forkJoin(
      from(this.boxViews.toArray()).pipe(
        concatMap((box: BoxReaderComponent, idx) => {
          return box.login(e);
        })
        // tap(defaultF => {
        //   logReview.debug('Sync login from filters : ', defaultF);
        // })
      )
    ).pipe(
      // https://stackoverflow.com/questions/48666086/rxjs-wait-for-all-observables-to-complete-and-return-results
      // mergeMap(q => forkJoin(...q)),
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
    logReview.debug('Sarting multi-next');

    // TODO : check errors resistance of below code :
    return forkJoin(
      from(this.boxViews.toArray()).pipe(
        concatMap((box: BoxReaderComponent, idx) => {
          return box.loadNext(e);
        })
      )
    ).pipe(
      tap(loadedBoxes => {
        logReview.debug('Did get next page for all boxes', loadedBoxes);
        this.ll.releaseLoadingLock();
      }),
      catchError((e, c) => {
        this.ll.releaseLoadingLock();
        throw e;
      })
    );
  }
  _expandBoxesConfigs = false;

  public set expandBoxesConfigs(v: boolean) {
    this._expandBoxesConfigs = v;
    this.localStorage.setItem('expand-boxes-configs', this.expandBoxesConfigs);
  }
  public get expandBoxesConfigs() {
    return this._expandBoxesConfigs;
  }

  toggleBoxesConfigs(e: any) {
    this.expandBoxesConfigs = !this.expandBoxesConfigs;
  }

  msgsOpenedIdx = {};
  expandMessages(e: any, moonBoxGroup: string) {
    if ((this.msgsOpenedIdx[moonBoxGroup] || { isOpen: false }).isOpen) {
      this.isMsgsCondensedEmitter.get(moonBoxGroup).next(true);
      this.msgsOpenedIdx[moonBoxGroup] = { isOpen: false };
      // clean sub expands on main group click by condensing all sub children:
      this.isMsgCondensedEmitter[moonBoxGroup].forEach((v: BehaviorSubject<boolean>, k: string) => {
        v.next(true);
      });
      this.msgsOpenedIdx[moonBoxGroup].msgOpenedIdx = {}; // TODO : algo issue ? not set for expandMessage, had to failback...
    } else {
      this.isMsgsCondensedEmitter.get(moonBoxGroup).next(false);
      this.msgsOpenedIdx[moonBoxGroup] = { isOpen: true };
    }
    // TODO : give infinit loop, will not use if DOM node wipe out => TODO : do it for OPTIM if needed (it unload component... making page lighter...)
    this.animationDelay = this.animationWorkload;
    of(0)
      .pipe(delay(this.animationWorkload))
      .subscribe(endState => {
        this.animationDelay = endState;
      });
  }
  animationWorkload = 2000;
  animationDelay = 0;
  isMsgsCondensedEmitter = new Map(); //  = new BehaviorSubject<boolean>(true); // new Subject<boolean>(); //
  isMsgsCondensed(moonBoxGroup: string, delayInMs: number = 0) {
    // const _isMsgsCondensed = !(this.msgsOpenedIdx[moonBoxGroup] || { isOpen : false }).isOpen;
    if (!this.isMsgsCondensedEmitter.has(moonBoxGroup)) {
      this.isMsgsCondensedEmitter.set(moonBoxGroup, new BehaviorSubject<boolean>(true));
    }
    // https://coryrylan.com/blog/angular-async-data-binding-with-ng-if-and-ng-else
    // Delay of 2 second, letting css animations ends...
    // => break stuffs, not using If optim for now : delay(delayInMs),
    return this.isMsgsCondensedEmitter.get(moonBoxGroup).pipe(share());
  }
  async expandMessage(e: any, moonBoxGroup: string, msgIdx: string) {
    // const msgKey = moonBoxGroup + msgIdx;
    this.msgsOpenedIdx[moonBoxGroup] = { ...{ msgOpenedIdx: {} }, ...this.msgsOpenedIdx[moonBoxGroup] };
    if (this.msgsOpenedIdx[moonBoxGroup].msgOpenedIdx[msgIdx]) {
      this.msgsOpenedIdx[moonBoxGroup].msgOpenedIdx[msgIdx] = false;
      this.isMsgCondensedEmitter[moonBoxGroup].get(msgIdx).next(true);
    } else {
      this.msgsOpenedIdx[moonBoxGroup].msgOpenedIdx[msgIdx] = true;
      this.isMsgCondensedEmitter[moonBoxGroup].get(msgIdx).next(false);
      // TODO : refactor to put iframe refresh in backend service; ok for now :
      // this.boxViews.first.updateIFrames();
      this.updateIFrames();
    }
  }
  _isMsgCondensed = true;
  isMsgCondensedEmitter: Map<string, BehaviorSubject<boolean>>[] = []; // new BehaviorSubject<boolean>(this._isMsgCondensed); // new Subject<boolean>(); //
  isMsgCondensed(moonBoxGroup: string, msgIdx: string) {
    // const msgKey = moonBoxGroup + msgIdx;
    if (!this.isMsgCondensedEmitter[moonBoxGroup]) {
      this.isMsgCondensedEmitter[moonBoxGroup] = new Map();
    }
    // this._isMsgCondensed = !(this.msgsOpenedIdx[dataUsername] || { msgOpenedIdx : {} }).msgOpenedIdx[msgIdx];
    // https://coryrylan.com/blog/angular-async-data-binding-with-ng-if-and-ng-else
    if (!this.isMsgCondensedEmitter[moonBoxGroup].has(msgIdx)) {
      this.isMsgCondensedEmitter[moonBoxGroup].set(msgIdx, new BehaviorSubject<boolean>(true));
    }
    return this.isMsgCondensedEmitter[moonBoxGroup].get(msgIdx).pipe(share());
    // return of(this._isMsgCondensed);
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

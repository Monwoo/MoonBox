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
  HostListener
} from '@angular/core';
import { NgForm, FormArray, Validators, FormBuilder } from '@angular/forms';
import { FormType, FORM_LAYOUT, formModel, formDefaults, ContextType, contextDefaults } from './filters-form.model';
import { I18nService } from '@app/core';
import { DynamicFormArrayModel, DynamicFormLayout, DynamicFormService, validate } from '@ng-dynamic-forms/core';
// import { LocalStorage } from '@ngx-pwa/local-storage';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';

import { shallowMerge } from '@moon-manager/tools';
import { NotificationsService } from 'angular2-notifications';
import { extract } from '@app/core';
import { MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import * as moment from 'moment';

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

  isSticky: boolean = false;
  initialOffset: number = 0;

  @HostListener('window:scroll', ['$event'])
  checkScroll() {
    if (!this.filtersFormRef) return; // will waith for filters to be displayed

    this.isSticky =
      window.pageYOffset >= this.initialOffset + 21 + this.filtersFormRef.nativeElement.getClientRects()[0].height;
    // this.filtersFormRef.nativeElement.getBoundingClientRect().bottom;
    if (this.isSticky) {
      this.filtersFormRef.nativeElement.parentElement.parentElement.style.marginTop =
        this.filtersFormRef.nativeElement.getClientRects()[0].height + 'px';
    } else {
      this.filtersFormRef.nativeElement.parentElement.parentElement.style.marginTop = '10px';
    }
  }

  filters: ContextType = null;

  mbegKeyTransformerControl: FormArray;
  mbegKeyTransformerModel: DynamicFormArrayModel;
  renderer: Renderer2 = null;

  constructor(
    private i18nService: I18nService,
    private formService: DynamicFormService,
    public storage: SecuStorageService,
    private ngZone: NgZone,
    private notif: NotificationsService,
    public eltRef: ViewContainerRef,
    private rendererFactory: RendererFactory2
  ) {
    (async () => {
      this.filters = await contextDefaults(this);
      this.updateForm();
    })();
    this.renderer = this.rendererFactory.createRenderer(null, null);
    this.storage.setLockContainer(this.eltRef);
  }

  ngAfterViewChecked() {
    this.storage.ensureLockIsNotClosable();
    if (this.filtersFormRef && !this.initialOffset) {
      this.initialOffset = this.filtersFormRef.nativeElement.offsetTop;
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
  }

  toggleFilters() {
    //if (this.filtersForm.classList (this.filtersForm, 'src'))
    if (this.filtersFormRef.nativeElement.classList.contains('condensed')) {
      this.renderer.removeClass(this.filtersFormRef.nativeElement, 'condensed');
    } else {
      this.renderer.addClass(this.filtersFormRef.nativeElement, 'condensed');
    }
  }

  onFiltersChange() {
    if (this.filtersForm.form.valid) {
      this.storage.getItem<FormType>('moon-box-filters', {}).subscribe(filtersData => {
        (async () => {
          // Called if data is valid or null
          let freshDefaults = await formDefaults(this);
          let transforms = <FormType>shallowMerge(1, freshDefaults, filtersData);
          this.filters.data = <FormType>shallowMerge(1, transforms, this.filters.group.value);
          this.filters.data.periode.fetchStartStr = this.filters.data.periode.fetchStart
            ? moment(this.filters.data.periode.fetchStart).format('YYYY/MM/DD')
            : null;
          this.filters.data.periode.fetchEndStr = this.filters.data.periode.fetchEnd
            ? moment(this.filters.data.periode.fetchEnd).format('YYYY/MM/DD')
            : null;

          this.storage.setItem('moon-box-filters', this.filters.data).subscribe(() => {
            this.i18nService.get(extract('mb.boxes.notif.changeRegistred')).subscribe(t => {
              this.notif.success('', t);
              // this.ll.hideLoader();
            });
          }, this.errorHandler);

          console.log('Patching Filters : ', this.filters.data);
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
            console.log('Patching form : ', this.filters.data);
            this.ngZone.run(() => {
              this.filters.group.patchValue(this.filters.data);
            });
          })();
        },
        error => {
          console.error('Fail to fetch config');
        }
      );
    } else {
      this.filters.group.patchValue(this.filters.data);
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
    // TODO : call login on all boxes child components
    console.log('TODO');
  }
  loadNext(e: any) {
    // TODO: paginantion
    console.log('TODO');
  }
}

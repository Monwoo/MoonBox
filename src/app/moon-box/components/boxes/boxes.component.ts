// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Component, OnInit, ViewChild, NgZone } from '@angular/core';
import { NgForm, FormGroup, Validators, FormBuilder } from '@angular/forms';
import { FormType, FORM_LAYOUT, formModel, formDefaults, ContextType, contextDefaults } from './filters-form.model';
import { I18nService } from '@app/core';
import { DynamicFormModel, DynamicFormLayout, DynamicFormService, validate } from '@ng-dynamic-forms/core';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { shallowMerge } from '@moon-manager/tools';
import { NotificationsService } from 'angular2-notifications';
import { extract } from '@app/core';

@Component({
  selector: 'moon-boxes',
  templateUrl: './boxes.component.html',
  styleUrls: ['./boxes.component.scss']
})
export class BoxesComponent implements OnInit {
  @ViewChild('filtersForm') filtersForm: NgForm = null;

  filters: ContextType = null;

  constructor(
    private i18nService: I18nService,
    private formService: DynamicFormService,
    private storage: LocalStorage,
    private ngZone: NgZone,
    private notif: NotificationsService
  ) {
    (async () => {
      this.filters = await contextDefaults(this);
      this.updateForm();
    })();
  }

  errorHandler(err: any) {
    console.error(err);
  }

  onFiltersChange() {
    this.storage.getItem<FormType>('moon-box-filters', {}).subscribe(
      filtersData => {
        (async () => {
          // Called if data is valid or null
          let freshDefaults = await formDefaults(this);
          let transforms = <FormType>shallowMerge(1, freshDefaults, filtersData);
          this.filters.data = <FormType>shallowMerge(1, transforms, this.filters.group.value);

          this.storage.setItem('moon-box-filters', this.filters.data).subscribe(() => {
            this.i18nService.get(extract('mm.param.notif.saveSucced')).subscribe(t => {
              this.notif.success(t);
              // this.ll.hideLoader();
            });
          }, this.errorHandler);

          console.log('Patching Filters : ', this.filters.data);
          this.ngZone.run(() => {
            this.filters.group.patchValue(this.filters.data);
          });
        })();
      },
      error => {
        console.error('Fail to fetch config');
      }
    );
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

  ngOnInit() {}
}

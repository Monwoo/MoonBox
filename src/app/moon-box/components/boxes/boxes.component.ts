import { Component, OnInit, ViewChild, NgZone } from '@angular/core';
import { NgForm, FormGroup, Validators, FormBuilder } from '@angular/forms';
import { FormType, FORM_LAYOUT, formModel, formDefaults, ContextType, contextDefaults } from './filters-form.model';
import { I18nService } from '@app/core';
import { DynamicFormModel, DynamicFormLayout, DynamicFormService, validate } from '@ng-dynamic-forms/core';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { shallowMerge } from '@moon-manager/tools';

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
    private ngZone: NgZone
  ) {
    (async () => {
      this.filters = await contextDefaults(this);
      this.updateForm();
    })();
  }

  async updateForm() {
    // Load from params from local storage ? :
    if (this.filters) {
      this.storage.getItem<FormType>('moon-box-filters', {}).subscribe(
        loginData => {
          (async () => {
            // Called if data is valid or null
            let freshDefaults = await formDefaults(this);
            this.filters.data = <FormType>shallowMerge(1, freshDefaults, loginData);
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

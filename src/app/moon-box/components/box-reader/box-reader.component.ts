// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Component, OnInit, ViewChild, Input, NgZone } from '@angular/core';
import { NgForm, FormGroup, Validators, FormBuilder } from '@angular/forms';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { BackendService, ProviderID } from '@moon-box/services/backend.service';
import { DynamicFormModel, DynamicFormLayout, DynamicFormService, validate } from '@ng-dynamic-forms/core';
import { I18nService } from '@app/core';
import { shallowMerge } from '@moon-manager/tools';
import { FormType, FORM_LAYOUT, formModel, formDefaults } from './login-form.model';
import { NotificationsService } from 'angular2-notifications';
import { extract } from '@app/core';
import { FormType as FiltersFormType } from '@moon-box/components/boxes/filters-form.model';

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
  }

  @ViewChild('loginForm') loginForm: NgForm = null; // TODO : fail to use for now

  // formModel: Promise<DynamicFormModel> = configFormModel(this);
  formModel: DynamicFormModel = null;
  // TODO : how to custom layout for embed form with NO html code ?
  // Need some code pattern to avoid id's clash ?
  formLayout: DynamicFormLayout = FORM_LAYOUT;
  // formGroup: BehaviorSubject<FormGroup> = new BehaviorSubject<FormGroup>(new FormGroup({}));
  formGroup: FormGroup = null;

  loginData: FormType = null;

  constructor(
    private fb: FormBuilder,
    public backend: BackendService,
    private i18nService: I18nService,
    private storage: LocalStorage,
    private formService: DynamicFormService,
    private ngZone: NgZone,
    private notif: NotificationsService
  ) {
    formDefaults(this).then(d => {
      this.loginData = d;
      this.updateForm();
    });
  }

  errorHandler(err: any) {
    console.error(err);
  }

  ngOnInit() {
    // const imapProvider = this.imapProviders[this.defaultProvider];
    const ctx = {};

    this.backend.fetchMsg(ctx).subscribe((messages: any) => {
      console.log(messages);
    }, this.errorHandler);
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
              let freshDefaults = await formDefaults(this);
              this.loginData = <FormType>shallowMerge(1, freshDefaults, loginData);
              // transforms... ?
              let transforms = this.loginData;
              this.loginData = <FormType>shallowMerge(1, this.loginData, transforms);
              console.log('Patching form : ', this.loginData);
              this.ngZone.run(() => {
                this.formGroup.patchValue(this.loginData);
              });
            })();
          },
          error => {
            console.error('Fail to fetch config');
          }
        );
      } else {
        this.formGroup.patchValue(this.loginData);
      }
    });
  }

  login(event: any) {
    const val: FormType = this.loginForm.form.value;
    if (this.loginForm.form.valid) {
      if (!/\*#__k/.test(val._password)) {
        val._password = '*' + '#__k' + 'ey' + btoa(val._password);
      }
      this.loginData = <FormType>shallowMerge(1, this.loginData, val);
      if (this.loginData.keepInMemory) {
        this.storage.setItem('moon-box-' + this.id, this.loginData).subscribe(() => {
          this.i18nService.get(extract('mm.param.notif.saveSucced')).subscribe(t => {
            this.notif.success(t);
            // this.ll.hideLoader();
          });
        }, this.errorHandler);
      } else {
        this.storage.removeItem('moon-box-' + this.id).subscribe(() => {
          console.log('No save required for moon-box-' + this.id);
        }, this.errorHandler);
      }
      this.backend.login(this.loginData).subscribe(() => {
        console.log('User is logged in');

        const ctx = {};

        this.backend.fetchMsg(ctx).subscribe((messages: any) => {
          console.log(messages);
        }, this.errorHandler);

        // this.router.navigateByUrl('/');
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
}

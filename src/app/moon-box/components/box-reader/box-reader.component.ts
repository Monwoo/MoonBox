// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Component, OnInit, ViewChild, Input, NgZone, Renderer2, RendererFactory2, ElementRef } from '@angular/core';
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
import { forkJoin, of, interval } from 'rxjs';

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
    console.error(err);
  }

  ngOnInit() {
    // const imapProvider = this.imapProviders[this.defaultProvider];
    const ctx = {};

    this.readMessages();
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

  readMessages() {
    this.backend.fetchMsg().subscribe((messages: any) => {
      console.log(messages);
      this.messages = messages;
      this.msgs.pushMessages(messages);
      this.updateIFrames();
    }, this.errorHandler);
  }

  updateIFrames() {
    of(() => {
      // Backend is configured to allow only One access to email content
      // Show only if needed, otherwise user will have to connect back to get the content
      let iframes = document.querySelectorAll('iframe[data-didload="0"]');
      iframes.forEach(f => {
        // this.renderer.setAttribute(f, 'src', f.getAttribute('data-src'));
        if (!parseInt(f.getAttribute('data-didLoad'))) {
          f.setAttribute('src', f.getAttribute('data-src'));
          f.setAttribute('data-didLoad', '1');
        }
      });
    })
      .pipe(delay(300))
      .subscribe((callback: any) => callback());
  }

  login(event: any) {
    const val: FormType = this.loginForm.form.value;
    if (this.loginForm.form.valid) {
      if (!/\*#__hash/.test(val._password)) {
        val._password = '*' + '#__hash' + (Math.random().toString(36) + '777777777').slice(2, 9) + btoa(val._password);
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

        this.readMessages();
        this.hasMoreMsgs = true; // TODO : pagination etc...
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
    console.log('TODO');
  }
}

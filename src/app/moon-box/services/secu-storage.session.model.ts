// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import {
  DynamicFormGroupModel,
  DynamicSelectModel,
  DynamicInputModel,
  DynamicFormArrayModel,
  DynamicFormControlModel,
  DynamicCheckboxModel,
  DYNAMIC_FORM_CONTROL_INPUT_TYPE_TEXT
} from '@ng-dynamic-forms/core';
import { extract } from '@app/core';
import { Logger } from '@app/core/logger.service';
import { DynamicFormModel, DynamicFormLayout, DynamicFormService, validate } from '@ng-dynamic-forms/core';
import { NgForm, FormGroup, Validators, FormBuilder } from '@angular/forms';
import { Observable } from 'rxjs';

const MonwooReview = new Logger('MonwooReview');

export type FormType = {
  currentSession: string;
  addSession: {
    // name: string;
    copyCurrentSession: boolean;
  };
};

export const formDefaults = async (caller: FormCallable) => {
  const translate = caller.i18nService;
  const fetchTrans = (t: string) =>
    new Promise<string>(r =>
      translate.get(t).subscribe((t: string) => {
        r(t);
      })
    ).catch(e => {
      MonwooReview.debug('Fail to translate', e);
      // throw 'Translation issue';
      return ''; // will be taken as await result on errors
    });
  return new Promise<FormType>(function(resolve, reject) {
    (async () => {
      resolve({
        currentSession: '',
        addSession: {
          // name: null,
          copyCurrentSession: false
        }
      });
    })();
  }).catch(e => {
    MonwooReview.debug('Fail to get defaults', e);
    throw e;
    // return {}; // will be taken as await result on errors
  });
};

export type ContextType = {
  model: DynamicFormModel;
  layout: DynamicFormLayout;
  group: FormGroup;
  data: FormType;
};

export interface FormCallable {
  i18nService: any; // TODO : rewrite code with interfaces to avoid circular inclusion possible warnings ???
  formService: DynamicFormService;
  getCurrentSession: () => Observable<ContextType>;
}

export const contextDefaults = async (caller: FormCallable) => {
  const translate = caller.i18nService;
  const fetchTrans = (t: string) =>
    new Promise<string>(r =>
      translate.get(t).subscribe((t: string) => {
        r(t);
      })
    ).catch(e => {
      MonwooReview.debug('Fail to translate', e);
      // throw 'Translation issue';
      return ''; // will be taken as await result on errors
    });
  return new Promise<ContextType>(function(resolve, reject) {
    (async () => {
      const model = await formModel(caller);
      resolve({
        model: model,
        layout: await formLayout(caller),
        group: caller.formService.createFormGroup(model),
        data: await formDefaults(caller)
      });
    })();
  }).catch(e => {
    MonwooReview.debug('Fail to get defaults', e);
    throw e;
    // return {}; // will be taken as await result on errors
  });
};

export const formLayout = async (caller: FormCallable) => ({
  // https://github.com/udos86/ng-dynamic-forms/blob/bfea1d8b/packages/core/src/model/misc/dynamic-form-control-layout.model.ts#L8
  //
  // name: {
  //   element: {
  //     container: 'height-animable condensable'
  //   }
  // },
  copyCurrentSession: {
    element: {
      container: 'height-animable condensable'
    }
  }
});

export const formModel = async (caller: FormCallable) => {
  const translate = caller.i18nService;
  const fetchTrans = (t: string) =>
    new Promise<string>(r =>
      translate.get(t).subscribe((t: string) => {
        r(t);
      })
    ).catch(e => {
      MonwooReview.debug('Fail to translate', e);
      // throw 'Translation issue';
      return ''; // will be taken as await result on errors
    });
  return new Promise<DynamicFormControlModel[]>(function(resolve, reject) {
    (async () => {
      const d = await formDefaults(caller);
      resolve([
        // new DynamicSelectModel({
        //   id: 'currentSession',
        //   label: await fetchTrans(extract('Choisir la session')),
        //   value: d.currentSession
        // }),
        new DynamicInputModel({
          id: 'currentSession',
          placeholder: await fetchTrans(extract('Choisir la session')),
          inputType: DYNAMIC_FORM_CONTROL_INPUT_TYPE_TEXT,
          // TODO : hint not showing, theming issue ?
          hint: await fetchTrans(extract('mb.filters.hint.typeEnterToAddChip')),
          list: ['Session TODO'], // ["Alabama", "Alaska", "Arizona", "Arkansas"]
          value: d.currentSession
        }),

        new DynamicFormGroupModel({
          // https://material.angular.io/components/datepicker/overview#internationalization
          id: 'addSession',
          group: [
            new DynamicCheckboxModel({
              id: 'copyCurrentSession',
              label: await fetchTrans(extract('Créer par copie')),
              value: d.addSession.copyCurrentSession
            })
          ]
        })
      ]);
    })();
  }).catch(e => {
    MonwooReview.debug('Fail to config form model', e);
    // throw 'Translation issue';
    return []; // will be taken as await result on errors
  });
};

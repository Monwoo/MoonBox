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

export type SessionStoreType = {
  // [k: string]: Date;
  [k: string]: string;
};

export type ItemStoreType<T> = {
  [k: string]: T;
};

export const sessionStoreInitialState = {};

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
};

export interface FormCallable {
  i18nService: any; // TODO : rewrite code with interfaces to avoid circular inclusion possible warnings ???
  formService: DynamicFormService;
  // getCurrentSession$: () => Observable<ContextType>;
  getCurrentSession: () => ContextType;
  getSessionIds$: () => Observable<SessionStoreType>;
  // getSessionIds: () => SessionStoreType;
}

export const contextDefaults = async (caller: FormCallable, patchData: any = {}) => {
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
      const session = caller.getCurrentSession();
      if (session) {
        session.group.patchValue(patchData);
      }
      const model = await formModel(caller, patchData);
      resolve({
        model: model,
        layout: await formLayout(caller),
        group: caller.formService.createFormGroup(model)
      });
    })();
  }).catch(e => {
    MonwooReview.debug('Fail to get defaults', e);
    throw e;
    // return {}; // will be taken as await result on errors
  });
};

export const formLayout = async (caller: FormCallable) => ({
  currentSession: {
    element: {
      container: 'w-100'
    }
  },
  copyCurrentSession: {
    element: {
      container: 'height-animable condensable'
    }
  },
  addSession: {
    element: {
      container: 'session-addSession'
    }
  }
});

export const formModel = async (caller: FormCallable, patchData: any) => {
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
      const session = caller.getCurrentSession();
      const d = { ...(session ? session.group.value : await formDefaults(caller)), ...patchData };
      const sessionIds = (await caller.getSessionIds$().toPromise()) || {};
      const suggestions = Object.keys(sessionIds).sort((ka, kb) => {
        return new Date(sessionIds[kb]).getTime() - new Date(sessionIds[ka]).getTime();
      });

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
          // hint: await fetchTrans(extract('mb.filters.hint.typeEnterToAddChip')),
          list: suggestions,
          autoComplete: 'off',
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

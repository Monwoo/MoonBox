// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import {
  DynamicFormGroupModel,
  DynamicCheckboxModel,
  DynamicInputModel,
  DynamicFormControlModel
} from '@ng-dynamic-forms/core';
import { extract } from '@app/core';
import { ProviderID } from '@moon-box/services/backend.service';
import { Logger } from '@app/core/logger.service';
import { FormType as FiltersFormType } from '@moon-box/components/boxes/filters-form.model';
const MonwooReview = new Logger('MonwooReview');

export interface FormType extends FiltersFormType {
  _username: string;
  _password: string;
  selectedProvider: ProviderID;
  keepInMemory: boolean;
  params: {
    mailhost: string;
    mailport: string;
    moonBoxEmailsGrouping: {
      // [key: string]: string,
      mbegKeyTransformer: {
        key: string;
        value: string;
      }[];
    };
    keywordsSubject: string[];
    keywordsBody: string[];
    avoidwords: string[];
  };
}

export const formDefaults = async (caller: any) => {
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
        _username: await fetchTrans(extract('JohnDoe@yopmail.com')),
        _password: '',
        selectedProvider: 'YopMail',
        keepInMemory: true,
        keepPasswordsInMemory: false,
        params: {
          // TODO : default provider not working yet... :
          // http://www.yopmail.com/en/
          // =>
          mailhost: 'imap.yopmail.com',
          mailport: '993',
          moonBoxEmailsGrouping: {
            // [await fetchTrans(extract('JohnDoe@yopmail.com'))]: await fetchTrans(extract('JohnDoe@yopmail.com'))
            mbegKeyTransformer: [
              {
                key: await fetchTrans(extract('JohnDoe@yopmail.com')),
                value: await fetchTrans(extract('JohnDoe@yopmail.com'))
              }
            ]
          },
          keywordsSubject: [],
          keywordsBody: [],
          avoidwords: []
        },
        periode: {
          fetchStart: null,
          fetchEnd: null,
          fetchStartStr: null,
          fetchEndStr: null
        }
      });
    })();
  }).catch(e => {
    MonwooReview.debug('Fail to get defaults', e);
    throw e;
    // return {}; // will be taken as await result on errors
  });
};

export const FORM_LAYOUT = {
  // https://github.com/udos86/ng-dynamic-forms/blob/bfea1d8b/packages/core/src/model/misc/dynamic-form-control-layout.model.ts#L8
  //

  _username: {
    // TODO : better id Unique system for whole app...
    element: {
      container: 'w-100'
    }
    // grid: {
    //     control: "col-sm-9",
    //     label: "col-sm-3"
    // }
  }
};

export const formModel = async (caller: any) => {
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
        new DynamicInputModel({
          id: '_username',
          label: await fetchTrans(extract('Email du compte')),
          inputType: 'email',
          placeholder: await fetchTrans(extract('Email')),
          value: d._username
        }),
        // TOOD : or use connective and relation ?
        // https://github.com/udos86/ng-dynamic-forms#related-form-controls
        ...('GoogleApi' === caller.loginData.selectedProvider
          ? []
          : [
              new DynamicInputModel({
                id: '_password',
                label: await fetchTrans(extract('Mot de passe')),
                inputType: 'password',
                placeholder: await fetchTrans(extract('Password')),
                value: d._password,
                validators: {
                  required: null,
                  minLength: 1
                },
                errorMessages: {
                  required: await fetchTrans(extract('{{ label }} requis.'))
                }
              })
            ]),
        // new DynamicCheckboxModel({
        //   id: 'keepInMemory',
        //   label: await fetchTrans(extract('Conserver la session (Accès au Navigateur == accès aux data)')),
        //   value: d.keepInMemory
        // }),
        new DynamicFormGroupModel({
          id: 'params',
          legend: await fetchTrans(extract('Paramètres')),
          group: [
            new DynamicInputModel({
              id: 'mailhost',
              label: await fetchTrans(extract('Url du server'))
            }),
            // TODO : based on backend modifiers per providers ?
            ...('GoogleApi' === caller.loginData.selectedProvider
              ? []
              : [
                  new DynamicInputModel({
                    id: 'mailport',
                    label: await fetchTrans(extract('Port du server'))
                  })
                ])
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

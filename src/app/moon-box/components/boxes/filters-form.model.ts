// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import {
  DynamicFormGroupModel,
  DynamicDatePickerModel,
  DynamicInputModel,
  DynamicFormArrayModel,
  DynamicFormControlModel,
  DynamicCheckboxModel
} from '@ng-dynamic-forms/core';
import { extract } from '@app/core';
import { Logger } from '@app/core/logger.service';
import { DynamicFormModel, DynamicFormLayout, DynamicFormService, validate } from '@ng-dynamic-forms/core';
import { NgForm, FormGroup, Validators, FormBuilder } from '@angular/forms';

const MonwooReview = new Logger('MonwooReview');

export type FormType = {
  periode: {
    fetchStart: Date;
    fetchEnd: Date;
  };
  keepInMemory: boolean;
  params: {
    moonBoxEmailsGrouping: {
      // [key: string]: string;
      mbegKeyTransformer: {
        key: string;
        value: string;
      }[];
    };
  };
};

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
        periode: {
          fetchStart: null,
          fetchEnd: null
        },
        keepInMemory: false,
        params: {
          moonBoxEmailsGrouping: {
            mbegKeyTransformer: []
          }
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

export const contextDefaults = async (caller: any) => {
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
        layout: FORM_LAYOUT,
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
  },
  keepInMemory: {
    element: {
      container: 'condensable'
    }
  },
  params: {
    element: {
      container: 'condensable'
    }
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
        new DynamicFormGroupModel({
          id: 'periode',
          group: [
            new DynamicDatePickerModel({
              id: 'fetchStart',
              inline: false,
              placeholder: await fetchTrans(extract('mb.boxes.filter.start.plhdr'))
            }),

            new DynamicDatePickerModel({
              id: 'fetchEnd',
              inline: false,
              placeholder: await fetchTrans(extract('mb.boxes.filter.end.plhdr'))
            })
          ],
          validators: {
            customDateRangeValidator: null
          },
          errorMessages: {
            customDateRangeValidator: await fetchTrans(extract('mb.boxes.filter.invalidPeriodErr'))
          }
        }),
        new DynamicCheckboxModel({
          id: 'keepInMemory',
          label: await fetchTrans(extract('Conserver la session (Accès au Navigateur == accès aux data)')),
          value: d.keepInMemory
        }),
        new DynamicFormGroupModel({
          id: 'params',
          legend: await fetchTrans(extract('Paramètres')),
          group: [
            new DynamicFormGroupModel({
              id: 'moonBoxEmailsGrouping',
              legend: await fetchTrans(extract("Associations d'adresses")),
              group: [
                new DynamicFormArrayModel({
                  id: 'mbegKeyTransformer',
                  initialCount: 1,
                  groupFactory: await (async () => {
                    const srcLbl = await fetchTrans(extract('Source'));
                    const assLbl = await fetchTrans(extract('Association'));
                    return () => [
                      new DynamicInputModel({
                        id: 'key',
                        label: srcLbl
                      }),
                      new DynamicInputModel({
                        id: 'value',
                        label: assLbl
                      })
                    ];
                  })()
                })
              ]
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

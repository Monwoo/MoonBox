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
    fetchStartStr: string;
    fetchEndStr: string;
  };
  keepFormsInMemory: boolean;
  keepMessagesInMemory: boolean;
  keepPasswordsInMemory: boolean;
  params: {
    moonBoxEmailsGrouping: {
      // [key: string]: string,
      mbegKeyTransformer: {
        key: string;
        value: string;
      }[];
    };
    keywordsSubject: string[];
    keywordsBody: string[];
    avoidwords: string[]; // TODO : not reflected by backend API for now
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
          fetchEnd: null,
          fetchStartStr: null,
          fetchEndStr: null
        },
        keepFormsInMemory: true,
        keepMessagesInMemory: false,
        keepPasswordsInMemory: false,
        params: {
          moonBoxEmailsGrouping: {
            mbegKeyTransformer: caller.filters
              ? caller.filters.data.params.moonBoxEmailsGrouping.mbegKeyTransformer
              : []
          },
          keywordsSubject: [],
          keywordsBody: [],
          avoidwords: []
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

  keywordsSubject: {
    element: {
      host: 'w-100'
    }
  },
  keywordsBody: {
    element: {
      host: 'w-100'
    }
  },
  keepFormsInMemory: {
    element: {
      container: 'condensable'
    }
  },
  periode: {
    element: {
      container: 'periode' // TODO : in sticky mode only (caller.isSticky)
    }
  },
  fetchStart: {
    element: {
      container: 'condensable' // TODO : in sticky mode only (caller.isSticky)
    }
  },
  fetchEnd: {
    element: {
      container: 'condensable' // TODO : in sticky mode only (caller.isSticky)
    }
  },
  keepPasswordsInMemory: {
    element: {
      container: 'condensable'
    }
  },
  params: {
    element: {
      container: 'condensable'
    }
  },
  key: {
    element: {
      host: 'mw-30'
    }
  },
  value: {
    element: {
      host: 'mw-30'
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
          // https://material.angular.io/components/datepicker/overview#internationalization
          id: 'periode',
          group: [
            new DynamicDatePickerModel({
              id: 'fetchStart',
              inline: false,
              // validators: { required: null },
              placeholder: await fetchTrans(extract('mb.boxes.filter.start.plhdr'))
            }),

            new DynamicDatePickerModel({
              id: 'fetchEnd',
              inline: false,
              // validators: { required: null },
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
          id: 'keepFormsInMemory',
          label: await fetchTrans(extract('Conserver les formulaires')),
          value: d.keepFormsInMemory
        }),
        new DynamicCheckboxModel({
          id: 'keepMessagesInMemory',
          label: await fetchTrans(extract('Conserver les messages')),
          value: d.keepFormsInMemory
        }),
        new DynamicCheckboxModel({
          id: 'keepPasswordsInMemory',
          label: await fetchTrans(extract('Conserver les mots de passes')),
          value: d.keepPasswordsInMemory
        }),
        new DynamicFormGroupModel({
          id: 'params',
          legend: await fetchTrans(extract('Paramètres')),
          group: [
            new DynamicInputModel({
              id: 'keywordsSubject',
              placeholder: await fetchTrans(extract('Recherche dans les sujets')),
              multiple: true,
              value: d.params.keywordsSubject
            }),
            new DynamicInputModel({
              id: 'keywordsBody',
              placeholder: await fetchTrans(extract('Recherche dans les contenus')),
              multiple: true,
              // validators: { required: null },
              value: d.params.keywordsBody
            }),
            new DynamicFormGroupModel({
              id: 'moonBoxEmailsGrouping',
              legend: await fetchTrans(extract("Associations d'adresses")),
              group: [
                new DynamicFormArrayModel({
                  id: 'mbegKeyTransformer',
                  initialCount: caller.filters
                    ? caller.filters.data.params.moonBoxEmailsGrouping.mbegKeyTransformer.length
                    : 0,
                  groupFactory: await (async () => {
                    const srcLbl = await fetchTrans(extract('Source'));
                    const assLbl = await fetchTrans(extract('Association'));
                    const srcList = await caller.msgs.srcSuggestions();
                    const requiredErrMsg = await extract('{{ label }} requis.');
                    const assList = srcList;
                    return () => [
                      new DynamicInputModel({
                        id: 'key',
                        // name: 'key',
                        label: srcLbl,
                        list: srcList, // ["Alabama", "Alaska", "Arizona", "Arkansas"]
                        validators: {
                          required: null,
                          minLength: 1
                        },
                        errorMessages: {
                          required: requiredErrMsg
                        }
                      }),
                      new DynamicInputModel({
                        id: 'value',
                        // name: 'value',
                        label: assLbl,
                        list: assList,
                        validators: {
                          required: null,
                          minLength: 1
                        },
                        errorMessages: {
                          required: requiredErrMsg
                        }
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

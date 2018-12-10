// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import {
  DynamicFormControlModel,
  DynamicCheckboxModel,
  DynamicInputModel,
  DynamicRadioGroupModel
} from '@ng-dynamic-forms/core';
import { extract } from '@app/core';
import { Logger } from '@app/core/logger.service';
const MonwooReview = new Logger('MonwooReview');

// export const configDefaults: ((caller: any) => any) = (caller?: any) => {
export const configDefaults = (caller: any) => {
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
  return new Promise<{
    paramTitle: string;
    agregationsFields: string[];
    authorReferencial: {};
    billedDays: number;
    paidDays: number;
    compensatedDays: number;
    receivedDays: number;
    summaryTitle: string;
    videoCopyright: string;
    videoFontColor: string;
    lowRes: boolean;
  }>(function(resolve, reject) {
    (async () => {
      resolve({
        paramTitle: await fetchTrans(extract('Pivot temporel :')),
        agregationsFields: ['Author', 'Project', 'SubProject', 'Objectif', 'Date', 'Time'],
        authorReferencial: {
          JohnDoe: await fetchTrans(extract('John Doe')),
          'John Doe': await fetchTrans(extract('John Doe')),
          'J. D.': await fetchTrans(extract('John Doe'))
        },
        billedDays: 0,
        paidDays: 0,
        compensatedDays: 0,
        receivedDays: 0,
        summaryTitle: await fetchTrans(extract("Compte rendu d'activité de M. John Doe")),
        videoCopyright: await fetchTrans(extract('© Monwoo (Private data)')),
        videoFontColor: await fetchTrans(extract('rgb(60,0,108)')),
        lowRes: false
      });
    })();
  }).catch(e => {
    MonwooReview.debug('Fail to config defaults', e);
    throw e;
    // return {}; // will be taken as await result on errors
  });
};

export const CONFIG_FORM_LAYOUT = {
  // https://github.com/udos86/ng-dynamic-forms/blob/bfea1d8b/packages/core/src/model/misc/dynamic-form-control-layout.model.ts#L8
  //

  summaryTitle: {
    // TODO : better id Unique system for whole app...
    element: {
      container: 'w-100'
    }
    // grid: {
    //     control: "col-sm-9",
    //     label: "col-sm-3"
    // }
  },
  authorReferencial: {
    // TODO : better id Unique system for whole app...
    element: {
      container: 'w-100'
    }
    // grid: {
    //     control: "col-sm-9",
    //     label: "col-sm-3"
    // }
  },
  lowRes: {
    element: {
      container: 'checkbox-form-field' // TODO : class do not seem to be injected....
    }
  }
};

// export const CONFIG_FORM_MODEL: DynamicFormModel = [
export const configFormModel = (caller: any) => {
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
      const config = await configDefaults(caller);
      resolve([
        // TODO : tool to auto gen ? or always time lost since design of form will bring back to specific.. ?
        // new DynamicInputModel({
        //   id: 'paramTitle',
        //   label: 'Titre de la config', // TODO : translate
        //   maxLength: 42,
        //   placeholder: 'Votre titre'
        // }),
        new DynamicInputModel({
          id: 'authorReferencial',
          placeholder: await fetchTrans(extract("Association des noms d'autheurs")),
          multiple: true,
          value: Object.keys(config.authorReferencial).map(k => {
            const v = config.authorReferencial[k];
            return `${k}===${v}`;
          })
        }),

        new DynamicInputModel({
          id: 'videoCopyright',
          label: await fetchTrans(extract('Titre de la vidéo')), // TODO : translate
          maxLength: 69,
          placeholder: await fetchTrans(extract('Copyright de la vidéo'))
        }),

        new DynamicInputModel({
          id: 'videoFontColor',
          label: await fetchTrans(extract('Couleur du text vidéo')), // TODO : translate
          maxLength: 69,
          placeholder: await fetchTrans(extract('Couleur du text'))
        }),

        new DynamicCheckboxModel({
          id: 'lowRes',
          label: await fetchTrans(extract('Activer le mode vidéo basse résolution'))
        }),

        new DynamicInputModel({
          id: 'summaryTitle',
          label: await fetchTrans(extract("Titre pour le comptre rendue d'activité")),
          placeholder: await fetchTrans(extract('Votre titre'))
        }),

        new DynamicInputModel({
          id: 'billedDays',
          inputType: 'number',
          placeholder: await fetchTrans(extract('Nombre de jours facturé')),
          // hint: "La somme de vos factures en jours",
          hint: await fetchTrans(extract('Total jours facturés'))
          // max: 5,
          // min: 0
        }),
        new DynamicInputModel({
          id: 'paidDays',
          inputType: 'number',
          placeholder: await fetchTrans(extract('Nombre de jours payé')),
          // hint: "La somme de vos encaissements à jours",
          hint: await fetchTrans(extract('Total jours encaissés'))
          // max: 5,
          // min: 0
        }),
        new DynamicInputModel({
          id: 'compensatedDays',
          inputType: 'number',
          // placeholder: "Nombre de jours via compensation diverse négocié",
          // hint: "La somme des compensations non facturés admise",
          placeholder: await fetchTrans(extract('Compensations négociées aquises en jours')),
          hint: await fetchTrans(extract('Total jours compensés'))
          // max: 5,
          // min: 0
        }),
        new DynamicInputModel({
          id: 'receivedDays',
          inputType: 'number',
          // placeholder: "Nombre de jours compensé",
          // hint: "Compensations diverses reçues en jours",
          placeholder: await fetchTrans(extract('Compensations reçuses en jours')),
          hint: await fetchTrans(extract('Total jours reçus'))
          // max: 5,
          // min: 0
        })
      ]);
    })();
  }).catch(e => {
    MonwooReview.debug('Fail to config form model', e);
    // throw 'Translation issue';
    return []; // will be taken as await result on errors
  });
};

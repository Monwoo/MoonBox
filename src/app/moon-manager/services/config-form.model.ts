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

// import { I18n } from '@ngx-translate/i18n-polyfill';
export interface ConfigType {
  paramTitle: string;
  saveMediasToLocalStorage: boolean;
  saveTimingsToLocalStorage: boolean;
}

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
  return new Promise<ConfigType>(function(resolve, reject) {
    (async () => {
      resolve({
        // // TODO : i18n EXTRACT FROM TS....
        // // using json way for now, but would be even nicer to have mixins or annotation system for translations...
        // paramTitle: caller.i18n({
        //   value: 'Chargement des captures',
        //   id: 'mm.cfl.paramTitle',
        //   meaning: 'Client file loader param title',
        //   description: 'Chargement des captures'
        // }),
        paramTitle: await fetchTrans(extract('Configuration des services :')),
        // TODO : 5Mb local storage for b64 encoded medias is not enough...
        // will need to use : https://developers.google.com/web/fundamentals/instant-and-offline/web-storage/cache-api
        saveMediasToLocalStorage: false,
        // TODO : having Quota errors => may be in V2 or V1.N : use google drive or remote pict storage system ?
        // => pb : network of 1Gb for video... better found local solution
        // => TODO : build and bundle a Chrome Extension to let MoonManager access storage of that extension ?
        // rolling with no caches for now, picts will diseapear if page refresh...
        saveTimingsToLocalStorage: false
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
  // captureRegex: {
  //   // TODO : better id Unique system for whole app...
  //   element: {
  //     container: 'w-100'
  //   }
  //   // grid: {
  //   //     control: "col-sm-9",
  //   //     label: "col-sm-3"
  //   // }
  // }
};

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
        // new DynamicInputModel({
        //   id: 'timingAuthor',
        //   label: 'Autheur à inspecter', // TODO : translate
        //   maxLength: 42,
        //   placeholder: "Nom d'autheur à regrouper"
        // }),
        // TODO : allow this option :
        // TODO : having Quota errors => may be in V2 or V1.N : use google drive or remote pict storage system ?
        // new DynamicCheckboxModel({
        //   id: 'saveMediasToLocalStorage',
        //   label: await fetchTrans(extract('service.saveMediasToLocalStorage.label'))
        // }),
        // new DynamicCheckboxModel({
        //   id: 'saveTimingsToLocalStorage',
        //   label: await fetchTrans(extract('service.saveTimingsToLocalStorage.label'))
        // })
      ]);
    })();
  }).catch(e => {
    MonwooReview.debug('Fail to config form model', e);
    // throw 'Translation issue';
    return []; // will be taken as await result on errors
  });
};

// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import {
  DynamicFormModel,
  DynamicCheckboxModel,
  DynamicInputModel,
  DynamicRadioGroupModel
} from '@ng-dynamic-forms/core';
import { extract } from '@app/core';

import { Logger } from '@app/core/logger.service';
const MonwooReview = new Logger('MonwooReview');

// import { I18n } from '@ngx-translate/i18n-polyfill';

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
    timingEventType: string;
    timingAuthor: string;
    timingSkills: string;
    timingProject: string;
    timingSubProject: string;
    timingObjectif: string;
    timingSegmentDelta: number;
    captureRegex: string[];
    thumbW: number;
    thumbH: number;
    regExGitLogFile: string;
    regExAuthor: string;
    regExProject: string;
    regExSubProject: string;
    regExObjectif: string;
    regExSkillsId: string;
  }>(function(resolve, reject) {
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
        paramTitle: await fetchTrans(extract('Chargement des captures :')),
        timingEventType: 'capture',
        timingAuthor: await fetchTrans(extract('John Doe')),
        timingSkills: 'RemoteEasyDev',
        timingProject: await fetchTrans(extract('Non classé')),
        timingSubProject: await fetchTrans(extract('Non classé')),
        timingObjectif: await fetchTrans(extract('Non classé')),
        timingSegmentDelta: 0.2,
        // TODO : improve Parameters up to deep properties lookup with auto-gen forms for edit
        // then transform below captureRegex to flexible array....
        captureRegex: [
          '.*Capture d’écran ([0-9]{4})-([0-9]{2})-([0-9]{2}) à ([0-9]{2}).([0-9]{2}).([0-9]{2}).*.(png|jpg|jpeg)',
          '.*Screenshot ([0-9]{4})-([0-9]{2})-([0-9]{2}) at ([0-9]{2}).([0-9]{2}).([0-9]{2}).*.(png|jpg|jpeg)',
          // 20181129_165121.jpg ou 2018_11_28_23_55_04.png
          '.*([0-9]{4})_?([0-9]{2})_?([0-9]{2})_([0-9]{2})_?([0-9]{2})_?([0-9]{2}).*.(png|jpg|jpeg)'
        ],
        thumbW: 700,
        thumbH: 400,
        regExGitLogFile: '.*.csv',
        regExAuthor: '^[^/]+/([^/]+)/',
        regExProject: '^[^/]+/[^/]+/([^/]+)/',
        regExSubProject: '^[^/]+/[^/]+/[^/]+/([^/]+)/',
        regExObjectif: '^[^/]+/[^/]+/[^/]+/[^/]+/([^/]+)/',
        regExSkillsId: '^[^/]+/[^/]+/[^/]+/[^/]+/[^/]+/([^/]+)/'
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

  captureRegex: {
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
  return new Promise<DynamicInputModel[]>(function(resolve, reject) {
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

        new DynamicInputModel({
          id: 'captureRegex',
          placeholder: await fetchTrans(extract("Expressions régulière pour la source : 'capture'")),
          // TODO : need to link language, extract is only TAGGING as translatable, not doing the translation...
          // TODO :
          // https://www.jonashendrickx.com/2017/12/06/await-observable-complete-angular/
          // private getTranslations(keys: string[]): Promise<any> {
          //   return new Promise((resolve, reject) => {
          //     this.translateSvc.get(keys).subscribe(success => {
          //       resolve(success);
          //     });
          //   });
          // }

          // TODO : issue to extract from TS file for now...
          // placeholder: caller.i18n({
          //   value: "Expressions régulière pour la source : 'capture'",
          //   id: 'mm.cfl.captureRegex.placeholder',
          //   meaning: 'RegEx for Captures',
          //   description: "Expressions régulière pour la source : 'capture'"
          // }),

          multiple: true,
          //minLength: 150,

          // value: ["hotel", "booking"]
          value: config.captureRegex
        }),
        new DynamicInputModel({
          id: 'thumbW',
          label: await fetchTrans(extract('Largeur du thumbnail')), // 'Thumbnail width|Largeur du thumbnail@@mm.cfl.thumbW.label')),
          inputType: 'number',
          placeholder: await fetchTrans(extract('Largeur')), // 'Width|Largeur@@mm.cfl.thumbW.placeholder')),
          value: config.thumbW // well, ovewritten by param config obj loaded from storage...
        }),
        new DynamicInputModel({
          id: 'thumbH',
          label: await fetchTrans(extract('Hauteur du thumbnail')), // 'Thumbnail height|Hauteur du thumbnaile@@mm.cfl.thumbW.label')),
          inputType: 'number',
          placeholder: await fetchTrans(extract('Hauteur')), // 'Height|Hauteur@@mm.cfl.thumbW.placeholder')),
          value: config.thumbH // well, ovewritten by param config obj loaded from storage...
        }),
        new DynamicInputModel({
          id: 'timingAuthor',
          label: await fetchTrans(extract('Autheur par défaut')), // TODO : translate
          maxLength: 69,
          placeholder: await fetchTrans('Autheur')
        }),
        new DynamicInputModel({
          id: 'timingSkills',
          label: await fetchTrans(extract('Id de compétances par défaut')), // TODO : translate
          maxLength: 69,
          placeholder: await fetchTrans('Id compétances')
        }),
        new DynamicInputModel({
          id: 'timingProject',
          label: await fetchTrans(extract('Projet par défaut')), // TODO : translate
          maxLength: 69,
          placeholder: await fetchTrans('Projet')
        }),
        new DynamicInputModel({
          id: 'timingSubProject',
          label: await fetchTrans(extract('Sous projet par défaut')), // TODO : translate
          maxLength: 69,
          placeholder: await fetchTrans('Sous projet')
        }),
        new DynamicInputModel({
          id: 'timingObjectif',
          label: await fetchTrans(extract('Objectif par défaut')), // TODO : translate
          maxLength: 69,
          placeholder: await fetchTrans('Objectif')
        })
      ]);
    })();
  }).catch(e => {
    MonwooReview.debug('Fail to config form model', e);
    // throw 'Translation issue';
    return []; // will be taken as await result on errors
  });
};

// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com
import { ActionReducer, MetaReducer } from '@ngrx/store';
import { environment } from '@env/environment';
import { Logger, I18nService } from '@app/core';

const log = new Logger('MetaReducers');

// if (environment.production) {
//   log.level ??;
// }

export function debug(reducer: ActionReducer<any>): ActionReducer<any> {
  return function(state, action) {
    log.debug('state', state);
    log.debug('action', action);

    return reducer(state, action);
  };
}
// Midelware list for Actions system
// https://ngrx.io/guide/store/metareducers
// https://ngrx.io/guide/store/recipes/injecting
export const metaReducers: MetaReducer<any>[] = [debug];

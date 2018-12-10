// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com
import { Injectable } from '@angular/core';
import { Timing } from '../api/data-model/timing';

import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';
import { TimingsActionTypes, TimingsActionsUnion, SetTimings, AddTimings } from './timings-buffer.actions';

// import { Effect, Actions, ofType } from '@ngrx/effects'; // import ofType operator
// // https://ngrx.io/guide/migration/v7
// @Injectable()
// export class MyEffects {
//   @Effect()
//   someEffect$: Observable<Action> = this.actions$.pipe(
//     ofType(UserActions.LOGIN), // use the pipeable ofType operator
//     map(() => new AnotherAction())
//   );
//   constructor(private actions$: Actions) {}
// }

export type TimingStateType = {
  datas: Timing[];
};

export const initialState: TimingStateType = {
  datas: []
};

export function timingsReducer(state = initialState, action: TimingsActionsUnion) {
  switch (action.type) {
    case TimingsActionTypes.SetTimings: {
      // State need to be a new OBJECT for subscribtor to get notified... :
      // Done through property expander : {... SrcObj}
      state = {
        ...state,
        datas: action.timings
      };
    }
    case TimingsActionTypes.AddTimings: {
      // State need to be a new OBJECT for subscribtor to get notified... :
      // Done through property expander : {... SrcObj}
      state = {
        ...state,
        datas: state.datas.concat(action.timings)
      };
    }
    default: {
    }
  }
  return state;
}

@Injectable({
  providedIn: 'root'
})
export class TimingsBufferService {
  timingState: Observable<TimingStateType>;
  bulk: Timing[] = [];

  // TODO : Transforming with
  // timingState.toPromise() may not fetch item...
  // Maybe since the call is made after the subscribe of another
  // component ??? => no pending data, so promise keep infinity ?? Strange...
  // Maybe I did miss somthing in the actual code...
  // No time to check what for now, backing up to local save :
  hackyCurrentStore: TimingStateType = initialState;

  constructor(private store: Store<{ timings: Timing[] }>) {
    this.timingState = store.pipe(select('timings'));
    this.timingState.subscribe(newStore => {
      this.hackyCurrentStore = newStore;
    });
  }

  async hasChanges() {
    // return (await this.timingState.toPromise()).datas.length > 0;
    return this.hackyCurrentStore.datas.length > 0;
  }

  // Will return a Copy of timings, modification to this array may not change source...
  async get() {
    // return this.timingState.toPromise();
    // return (await this.timingState.toPromise()).datas;
    return this.hackyCurrentStore.datas;
  }

  // async exist(query:Timing)

  // Insert timings with default bulk submit when size goese over bulkAfter value
  async addBulk(datas: Timing[], bulkAfter = 200) {
    this.bulk = this.bulk.concat(datas);
    if (this.bulk.length > bulkAfter) {
      this.store.dispatch(new AddTimings(this.bulk));
      this.bulk = [];
    }
    // return await this.timingState;
  }

  // Will submit pending bulk if some data is pending
  async finalizeBulks() {
    this.store.dispatch(new AddTimings(this.bulk));
    this.bulk = [];
  }

  async set(datas: Timing[]) {
    this.store.dispatch(new SetTimings(datas));
    // return await this.timingState;
  }

  async clear() {
    this.store.dispatch(new SetTimings([]));
    // return await this.timingState;
  }
}

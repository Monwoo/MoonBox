// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com
import { Action } from '@ngrx/store';
import { Timing } from '../api/data-model/timing';

export enum TimingsActionTypes {
  SetTimings = '[TimingsBuffer Service] SetTimings',
  AddTimings = '[TimingsBuffer Service] AddTimings'
}

export class SetTimings implements Action {
  readonly type = TimingsActionTypes.SetTimings;

  constructor(public timings: Timing[]) {}
}

export class AddTimings implements Action {
  readonly type = TimingsActionTypes.AddTimings;

  constructor(public timings: Timing[]) {}
}

export type TimingsActionsUnion = SetTimings | AddTimings;

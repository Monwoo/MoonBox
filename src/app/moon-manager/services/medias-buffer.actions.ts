// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com
import { Action } from '@ngrx/store';
import { Media } from './medias-buffer.service';

export enum MediasActionTypes {
  SetMedias = '[MediasBuffer Service] SetMedias',
  AddMedias = '[MediasBuffer Service] AddMedias'
}

export class SetMedias implements Action {
  readonly type = MediasActionTypes.SetMedias;

  constructor(public medias: Media[]) {}
}

export class AddMedias implements Action {
  readonly type = MediasActionTypes.AddMedias;

  constructor(public medias: Media[]) {}
}

export type MediasActionsUnion = SetMedias | AddMedias;

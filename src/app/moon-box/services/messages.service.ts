// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type MsgsStateType = {
  [key: string]: {
    numResults: number;
    totalCount: number;
    pages: {
      [key: number]: any;
    };
  };
};

export const initialState: MsgsStateType = {};

@Injectable({
  providedIn: 'root'
})
export class MessagesService {
  private msgs: MsgsStateType = initialState;
  public service: BehaviorSubject<MsgsStateType> = new BehaviorSubject(this.msgs);
  public numResults: number = 0;
  public totalCount: number = 0;
  constructor() {}

  pushMessages(mailBoxId: string, messages: any) {
    if (this.msgs[messages.moonBoxGroup]) {
      this.msgs[messages.moonBoxGroup].numResults += messages.numResults;
      this.msgs[messages.moonBoxGroup].totalCount += messages.totalCount;
      this.msgs[messages.moonBoxGroup][messages.currentPage] = messages;
    } else {
      this.msgs[messages.moonBoxGroup] = {
        numResults: messages.numResults,
        totalCount: messages.totalCount,
        pages: {
          [messages.currentPage]: messages
        }
      };
    }
    this.numResults += messages.numResults;
    this.totalCount += messages.totalCount;
    this.service.next(this.msgs);
  }

  clearMessages() {
    this.msgs = initialState;
    this.service.next(this.msgs);
  }
}

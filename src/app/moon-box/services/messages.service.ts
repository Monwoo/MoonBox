// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type MsgsStateType = {
  [key: string]: {
    numResults: number;
    totalCount: number;
    data: {
      [key: string]: any[];
    };
    sortedKey?: string[];
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

  pushMessages(messages: any) {
    let alreadyCounted = 0;
    messages.msgsOrderedByDate.forEach((msg: any) => {
      if (!this.msgs[msg.moonBoxGroup]) {
        this.msgs[msg.moonBoxGroup] = {
          numResults: 0,
          totalCount: 0,
          data: {}
        };
      }
      const dataKey = msg.localTime + msg.msgId;
      if (this.msgs[msg.moonBoxGroup].data[dataKey]) {
        alreadyCounted++;
      } else {
        this.msgs[msg.moonBoxGroup].numResults += 1;
        this.msgs[msg.moonBoxGroup].totalCount += 1; // TODO : not accurate enough for now....
      }
      this.msgs[msg.moonBoxGroup].data[dataKey] = msg;
    });
    // this.numResults += messages.numResults - alreadyCounted;
    // this.totalCount += messages.totalCount - alreadyCounted; // Accuracy ok
    // this.numResults = Object.keys(this.msgs).reduce((acc: number, k: string) => {
    //   return acc + this.msgs[k].numResults;
    // }, 0);
    // this.totalCount = Object.keys(this.msgs).reduce((acc: number, k: string) => {
    //   return acc + this.msgs[k].totalCount;
    // }, 0);
    this.totalCount = 0;
    this.numResults = 0;
    Object.keys(this.msgs).forEach((k: string) => {
      const msg = this.msgs[k];
      this.totalCount += msg.totalCount;
      this.numResults += msg.numResults;
      msg.sortedKey = Object.keys(msg.data)
        .sort()
        .reverse();
    });
  }

  clearMessages() {
    this.msgs = initialState;
    this.service.next(this.msgs);
  }
}

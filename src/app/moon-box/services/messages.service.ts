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
  private msgs: MsgsStateType = { ...initialState };
  public service: BehaviorSubject<MsgsStateType> = new BehaviorSubject(this.msgs);
  public numResults: number = 0;
  public totalCount: number = 0;
  public availability: {} = {};
  public totalAvailable: number = 0; // Counting availables next pages for all connected data users
  private suggestionDict = {};
  // public _srcSuggestions: BehaviorSubject<string[]> = new BehaviorSubject(Object.keys(this.suggestionDict));
  public async srcSuggestions() {
    return Object.keys(this.suggestionDict);
  }
  constructor() {}

  pushMessages(messages: any) {
    let alreadyCounted = 0;
    this.availability[messages.dataUser] = messages.nextPage ? 1 : 0;

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
        if ('_' !== msg.moonBoxGroup) {
          this.msgs[msg.moonBoxGroup].numResults += 1;
        }
        this.msgs[msg.moonBoxGroup].totalCount += 1; // TODO : not accurate enough for now....
      }
      this.msgs[msg.moonBoxGroup].data[dataKey] = msg;
      this.suggestionDict[msg.expeditor] = null;
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
    this.totalAvailable = 0;
    Object.keys(this.availability).forEach((k: string) => {
      this.totalAvailable += this.availability[k];
    });
    // this.srcSuggestions.next(Object.keys(this.suggestionDict));
    this.service.next(this.msgs);
  }

  clearMessages() {
    this.msgs = { ...initialState };
    this.suggestionDict = {};
    this.totalCount = 0;
    this.numResults = 0;
    this.availability = {};
    this.totalAvailable = 0;
    this.service.next(this.msgs);
  }
}

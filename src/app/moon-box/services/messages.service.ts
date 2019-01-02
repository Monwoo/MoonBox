// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';
import { pluck, map, tap } from 'rxjs/operators';

import { Logger } from '@app/core/logger.service';
const logReview = new Logger('MonwooReview');

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
  private ctxByBox = {};
  // public _srcSuggestions: BehaviorSubject<string[]> = new BehaviorSubject(Object.keys(this.suggestionDict));

  constructor(private storage: SecuStorageService) {
    this.storage.onUnlock.subscribe(() => {
      this.storage.getItem('moon-box-messages', null).subscribe(bundle => {
        logReview.debug('Loading messages from memory : ', bundle);

        if (bundle) {
          Object.assign(this, bundle);
        }
        this.service.pipe(
          tap(msgs => {
            if (this._shouldKeepMsgsInMemory) {
              this.keepMessagesInMemory();
            }
          })
        );
      });
    });
  }

  getBoxContext(boxId: string, defaultCtx: any = null) {
    let storedCtx = this.ctxByBox[boxId];
    if (!storedCtx) {
      storedCtx = defaultCtx;
      this.ctxByBox[boxId] = storedCtx;
    }
    return storedCtx;
  }

  public async srcSuggestions() {
    return Object.keys(this.suggestionDict);
  }

  pushMessages(messages: any) {
    let alreadyCounted = 0;
    this.availability[messages.dataUser] = messages.nextPage ? 1 : 0;

    messages.msgsOrderedByDate.forEach((msg: any) => {
      msg.moonBoxGroups.forEach((moonBoxGroup: string) => {
        if (!this.msgs[moonBoxGroup]) {
          this.msgs[moonBoxGroup] = {
            numResults: 0,
            totalCount: 0,
            data: {}
          };
        }
        const dataKey = msg.localTime + msg.msgId;
        if (this.msgs[moonBoxGroup].data[dataKey]) {
          alreadyCounted++;
        } else {
          if ('_' !== moonBoxGroup) {
            this.msgs[moonBoxGroup].numResults += 1;
          }
          this.msgs[moonBoxGroup].totalCount += 1; // TODO : not accurate enough for now....
        }
        this.msgs[moonBoxGroup].data[dataKey] = msg;
        this.suggestionDict[msg.expeditor] = null;
      });
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

  bundleForMemorySave() {
    return of(this).pipe(
      pluck('msgs', 'numResults', 'totalCount', 'availability', 'totalAvailable', 'suggestionDict', 'ctxByBox')
    );
  }

  _shouldKeepMsgsInMemory = false;
  shouldKeepMsgsInMemory(should: boolean) {
    this._shouldKeepMsgsInMemory = should;
    if (should) {
      this.keepMessagesInMemory();
    } else {
      this.removeMessagesFromMemory();
    }
  }

  keepMessagesInMemory() {
    return this.bundleForMemorySave().pipe(
      map((bundle: any) => {
        return this.storage.setItem('moon-box-messages', bundle).pipe(
          tap(() => {
            logReview.debug('Messages saved to memory');
          })
        );
      })
    );
  }

  removeMessagesFromMemory() {
    return this.storage.removeItem('moon-box-messages').pipe(
      tap(() => {
        logReview.debug('Did remove messages from memory');
      })
    );
  }

  // errorHandler(err: any) {
  //   logReview.error('Message service error ', err);
  // }
}

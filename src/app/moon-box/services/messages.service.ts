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
      this.clearMessages();
      this.loadMsgsFromStorage();
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
      let g = msg.moonBoxGroups;
      if (!g) g = ['_'];
      if (!Array.isArray(g)) g = [g]; // TODO : some monBoxGroups do not have array value, but string ones... should be array... TODO : refactor & tests
      g.forEach((moonBoxGroup: string) => {
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

  loadMsgsFromStorage() {
    this.storage.getItem('moon-box-messages', null).subscribe(bundle => {
      logReview.debug('Loading messages from memory : ', bundle);

      if (bundle) {
        Object.assign(this, bundle);
        this.service.next(this.msgs); // Emit freshly loaded messages to get UI refreshs
      }
      // // TODO : why below do not work ?
      // this.service.pipe(
      //   tap(msgs => {
      //     if (this._shouldKeepMsgsInMemory) {
      //       this.keepMessagesInMemory();
      //     }
      //   })
      // );
      this.service.subscribe(msgs => {
        if (this._shouldKeepMsgsInMemory) {
          this.keepMessagesInMemory();
        }
      });
    });
  }

  bundleForMemorySave() {
    const bundleKeys = [
      'msgs',
      'numResults',
      'totalCount',
      'availability',
      'totalAvailable',
      'suggestionDict',
      'ctxByBox',
      '_shouldKeepMsgsInMemory'
    ];
    const bundle = {};
    bundleKeys.forEach(k => {
      bundle[k] = this[k];
    });
    return of(bundle);
  }

  _shouldKeepMsgsInMemory = false;
  shouldKeepMsgsInMemory(should: boolean) {
    this._shouldKeepMsgsInMemory = should;
    if (should) {
      this.keepMessagesInMemory().subscribe(); // TODO : better design pattern to avoid subscription... ?
    } else {
      this.removeMessagesFromMemory().subscribe(); // TODO : better design pattern to avoid subscription... ?
    }
  }

  // storageHaveKeepMsgsInMemory() {
  //   return this.storage.getItem("moon-box-filters").pipe(
  //     pluck('keepMessagesInMemory'),
  //   );
  // }

  keepMessagesInMemory() {
    return this.bundleForMemorySave().pipe(
      map((bundle: any) => {
        return this.storage.setItem('moon-box-messages', bundle).pipe(
          tap(status => {
            logReview.debug('Messages saved to memory', status);
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

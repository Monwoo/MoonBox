// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable } from '@angular/core';
import { BehaviorSubject, of, ReplaySubject } from 'rxjs';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';
import { pluck, map, tap, share } from 'rxjs/operators';
import { I18nService } from '@app/core';
import { extract } from '@app/core';
import { NotificationsService } from 'angular2-notifications';
import * as moment from 'moment';

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
  public service = new ReplaySubject<MsgsStateType>();
  public numResults: number = 0;
  public totalCount: number = 0;
  public availability: {} = {};
  public totalAvailable: number = 0; // Counting availables next pages for all connected data users
  private suggestionDict = {};
  private ctxByBox = {};
  // public _srcSuggestions: BehaviorSubject<string[]> = new BehaviorSubject(Object.keys(this.suggestionDict));

  constructor(
    private storage: SecuStorageService,
    private i18nService: I18nService,
    private notif: NotificationsService
  ) {
    this.storage.onUnlock.subscribe(() => {
      this.reloadMsgsFromStorage();
      // Trying to avoid duplicat calls, already done when new messages gets inputs,
      // => so below is already called by this.reloadMsgsFromStorage();
      // this.ensureLocaleMemorySyncForMsgs();

      // if (!this.storage.isSessionGettingSetedUp) {
      //   // Avoid quick session switching claches by ignoring refresh while setup ?
      //   this.reloadMsgsFromStorage();
      //   this.loadMsgsFromStorage();
      // }
    });

    this.service.subscribe(msgs => {
      // <- will subscribe on each service instanciation...
      this.ensureLocaleMemorySyncForMsgs();
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

  private clearLocalMessages() {
    this.msgs = { ...initialState };
    this.suggestionDict = {};
    this.totalCount = 0;
    this.numResults = 0;
    this.availability = {};
    this.totalAvailable = 0;
    // this.shouldKeepMsgsInMemory = false; // Useful ? => buggy...
  }

  clearMessages() {
    this.clearLocalMessages();
    // TODO : better design, hard to understand that somewhere
    // on service listener messages get's save if user did check save
    // Msgs option on filters form...
    // => should clear storage ? How many buggy side effect for this fix ?
    this.service.next(this.msgs);
  }

  reloadMsgsFromStorage() {
    // this.clearLocalMessages(); // Wrong behavior, better to send initial state on fail load..
    this.loadMsgsFromStorage();
  }

  loadMsgsFromStorage() {
    this.storage.getItem('moon-box-messages', null).subscribe(bundle => {
      logReview.debug('Loading messages from memory : ', bundle);

      if (bundle) {
        Object.assign(this, bundle);
        this.service.next(this.msgs); // Emit freshly loaded messages to get UI refreshs
      } else {
        this.service.next({ ...initialState });
      }
      // // TODO : why below do not work ?
      // this.service.pipe(
      //   tap(msgs => {
      //     if (this._shouldKeepMsgsInMemory) {
      //       this.keepMessagesInMemory();
      //     }
      //   })
      // );
      // this.service.subscribe(msgs => { // <- will subscribe on each method call...
      //   // TODO: quick hack for now, need to rewrite session did switch ?
      //   // => avoid messages wipe out if too fast session switch...
      //   // if (shouldRewrite && this._shouldKeepMsgsInMemory) {
      //   // if (this._shouldKeepMsgsInMemory) {
      //   //   this.keepMessagesInMemory(); // <- will not call since not .subscribe()...
      //   // }
      // });
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

  // _shouldKeepMsgsInMemory = false;
  // shouldKeepMsgsInMemory(should: boolean) {
  //   this._shouldKeepMsgsInMemory = should;
  //   if (should) {
  //     this.keepMessagesInMemory().subscribe(); // TODO : better design pattern to avoid subscription... ?
  //   } else {
  //     this.removeMessagesFromMemory().subscribe(); // TODO : better design pattern to avoid subscription... ?
  //   }
  // }
  private _shouldKeepMsgsInMemory = false;

  public set shouldKeepMsgsInMemory(should: boolean) {
    this._shouldKeepMsgsInMemory = should;
    this.ensureLocaleMemorySyncForMsgs();
  }

  public get shouldKeepMsgsInMemory(): boolean {
    return this._shouldKeepMsgsInMemory;
  }

  ensureLocaleMemorySyncForMsgs() {
    if (this.shouldKeepMsgsInMemory) {
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
      }),
      // https://www.learnrxjs.io/operators/multicasting/share.html
      // https://www.learnrxjs.io/operators/multicasting/sharereplay.html
      share()
    );
  }

  removeMessagesFromMemory() {
    return this.storage.removeItem('moon-box-messages').pipe(
      tap(() => {
        // No local clean needed, since may need to use those to
        // save last loaded message if user toggle save msgs btn...
        // if (this.totalCount === 0) {
        //   logReview.debug('No clean needed for this removal');
        // } else {
        //   this.clearMessages();
        // }
        logReview.debug('Did ensure messages are removed from memory');
      }),
      share()
    );
  }

  // errorHandler(err: any) {
  //   logReview.error('Message service error ', err);
  // }

  exportAsMoonManagerTimings() {
    const exportData = (src: any) => {
      const str = JSON.stringify(src);
      const blob = new Blob([str], { type: 'text/json' });
      const url = window.URL.createObjectURL(blob);
      const element = document.createElement('a');
      const prefix = 'moon-box-timings-';
      element.href = url;
      element.download = prefix + moment().format('YYYYMMDDHHmmss') + '.json';
      document.body.appendChild(element);
      element.click();
      this.i18nService
        .get(extract('mb.msgs.notif.exportAsMoonManagerTimingsSucced'), {
          dest: element.download
        })
        .subscribe(t => {
          this.notif.success(t);
        });
    };
    let mmTimings: any[] = [];

    Object.keys(this.msgs).forEach((k: string) => {
      const msgBox = this.msgs[k];
      Object.keys(msgBox.data).forEach(msgK => {
        const msg = msgBox.data[msgK];
        // multiplied by 1000 so that the argument is in milliseconds, not seconds.
        const msgDate = new Date(msg['timestamp'] * 1000);
        mmTimings.push({
          Author: 'Moon Box ', //  + this.storage.getCurrentSessionId(),
          Comment: 'From ' + msg['expeditor'] + ' to ' + msg['to'],
          Date: msg['localTime'].split(' ')[0], // '2019/01/15'
          DateTime: msgDate.toISOString(),
          EventSource: 'moon-box',
          ExpertiseLevel: 'RemoteEasyDev',
          LinearWorkloadAmount: 1,
          MediaUrl: msgK,
          Month: '',
          Objectif: msg['to'],
          OverrideReduction: '',
          OverrideSequence: '',
          Price: 80,
          Project: k,
          ReviewedComment: '',
          SegmentDeltaHr: 1,
          SegmentMax: '',
          SegmentMin: '',
          SegmentOverride: 0,
          SkillsId: 'RemoteEasyDev',
          SubProject: msg['expeditor'],
          TJM: 400,
          TJMWorkloadByDay: 5,
          Time: msg['localTime'].split(' ')[1],
          Title: msg['expeditor'] + ' : ' + msg['subject'],
          WorkloadAmount: 1,
          Year: '',
          id: 1,
          isHidden: false
        });
      });
    });

    exportData(mmTimings);
  }
}

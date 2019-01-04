// Copyright Monwoo 2019, made by Miguel Monwoo, service@monwoo.com
// Aim : let user trace back all it's current usage errors...
import { Injectable } from '@angular/core';
import { NotificationsService, Notification } from 'angular2-notifications';
import { LinkedList, IterableClass } from '@moon-box/tools/linked-list';
import { of, BehaviorSubject } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { extract } from '@app/core';
import { I18nService } from '@app/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationsBufferService {
  private data: Notification[] = []; // V1 & V2
  // private data = new LinkedList<Notification>(); // V3 => pb : data iterator do not seem stable...
  get maxLength() {
    return this._maxLength;
  }
  private _maxLength: number = 21;

  constructor(private notif: NotificationsService, private i18nService: I18nService, private storage: LocalStorage) {
    // https://github.com/flauc/angular2-notifications/blob/master/src/services/notifications.service.ts
    notif.emitter.subscribe(e => {
      this.addEvent(e.notification);
    });
    this.storage.getItem('notif-buffer.logLimit').subscribe((storedSize: number) => {
      this._maxLength = storedSize || this._maxLength; // Keep default size if fail to fetch
    });
  }

  addEvent(e: Notification) {
    this.data.push(e); // V1 : Complexity : O(1) for this.data as array
    // this.data.unshift(e); // V2 : Complexity : O(n) for this.data as array
    // this.data.addToHead(e); // V3 : Complexity : O(~1) for this.data as LinkedList
    while (this.data.length > this._maxLength) {
      this.data.slice(1); // V1 : Complexity : O(n - 1) for this.data as array
      // this.data.pop(); // V2 : Complexity : O(n - 1) for this.data as array
      // this.data.removeFromTail(); // V3 : Complexity : O(~1) for this.data as LinkedList
    }
    // this.data$.next(this.data); // V3
  }

  all() {
    return this.data.reverse(); // V1 & V2
    // return this.data.all(); // V3
  }

  // V3 :
  /*
  data$ = //<BehaviorSubject<LinkedList<Notification>>> // TODO : this line for VisualCode linter, interpret below as Observable and not as BehaviorSubject<LinkedList<Notification>> if using pipe...
  new BehaviorSubject<LinkedList<Notification>>(this.data);
  // .pipe(delay(0), map(d => d)); // Try to avoid ExpressionChangedAfterItHasBeenCheckedError in moon-box parameter component
  dataDelayed$F() {
    return this.data$.pipe(delay(0));
  }
  */

  // Not a Good Idea to async send same Iterator Instance => only first instance
  // Will be able to consume data and all other with get empty array with below :
  // public all$= new BehaviorSubject<IterableClass<Notification>>(this.data.all());

  // all$() {
  //   // https://blog.angular-university.io/angular-debugging/
  //   // => using delay to avoid ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. error
  //   // => but Why this error ? no ngAfterViewInit used in moon-box parameter component...
  //   return of(this.data.all()).pipe(delay(0)); // No really working, always returning null...
  //   // Async pipe is ok with RxJS, use .toPromise(); for ES6 await keyword only
  //   // + .toPromise is removing multi-cast effect of observables
  // }

  getSize() {
    return this.data.length;
  }

  getlogLimit() {
    return this._maxLength;
  }

  setlogLimit(newSize: number) {
    this._maxLength = newSize;
    this.storage.setItem('notif-buffer.logLimit', this._maxLength).subscribe(() => {
      this.i18nService
        .get(extract('mb.notif-buffer.notif.setLogLimit{newSize}'), {
          newSize: this._maxLength
        })
        .subscribe(t => {
          this.notif.info('', t);
        });
    });
  }
}

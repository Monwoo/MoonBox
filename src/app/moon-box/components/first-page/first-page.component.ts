// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com
import { Component, OnInit, OnDestroy } from '@angular/core';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-first-page',
  templateUrl: './first-page.component.html',
  styleUrls: ['./first-page.component.scss']
})
export class FirstPageComponent implements OnInit, OnDestroy {
  private unsubscribe$ = new Subject();
  isStorageLocked = true;
  constructor(public storage: SecuStorageService) {
    this.storage.onUnlock.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
      this.isStorageLocked = false;
    });
    this.storage.onLock.pipe(takeUntil(this.unsubscribe$)).subscribe(() => {
      this.isStorageLocked = true;
    });
    this.storage.checkLockScreen();
  }

  ngOnInit() {}

  // https://stackoverflow.com/questions/38008334/angular-rxjs-when-should-i-unsubscribe-from-subscription
  // https://blog.codecentric.de/en/2018/01/different-ways-unsubscribing-rxjs-observables-angular/
  //
  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
}

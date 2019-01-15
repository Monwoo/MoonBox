// Copyright Monwoo 2018-2019, made by Miguel Monwoo, service@monwoo.com

import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
  AfterViewInit,
  ViewChildren,
  QueryList
} from '@angular/core';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material';
import { Logger } from '@app/core/logger.service';
const logReview = new Logger('MonwooReview');

@Component({
  selector: 'moon-box-session-form',
  templateUrl: './session-form.component.html',
  styleUrls: ['./session-form.component.scss']
})
export class SessionFormComponent implements OnInit {
  @ViewChild('sessionFormRef') sessionFormRef: ElementRef<HTMLFormElement> = null;
  // @ViewChild(MdAutocompleteTrigger) trigger;
  // https://github.com/udos86/ng-dynamic-forms/blob/ae2ee717cc8e1861d02ac38dbe259517d43d91a5/packages/ui-material/src/input/dynamic-material-input.component.ts
  // @ViewChild(MatAutocomplete) matAutocomplete: MatAutocomplete;
  // @ViewChildren(MatAutocompleteTrigger) matAutocompletes!: QueryList<MatAutocompleteTrigger>;
  // TODO : how to get matAutocomplete to know if change comes from autocomplete or from other change event ?
  @ViewChild('.mat-autocomplete-panel') matAutocomplete: MatAutocomplete;

  @HostListener('window:keyup', ['$event'])
  keyUp(e: any) {
    // logReview.debug("Having Key Up Event :", e);
    this.storage.onSessionKeyUp(e);
  }

  constructor(public storage: SecuStorageService) {}

  ngOnInit() {}

  // Better to use :
  // https://angular.io/guide/lifecycle-hooks#aftercontent
  // https://stackoverflow.com/questions/43375532/expressionchangedafterithasbeencheckederror-explained
  // ... implements AfterContentInit
  // ....
  //   ngAfterContentInit() { ....

  // ngAfterViewInit() {
  //   // https://medium.com/@tkssharma/understanding-viewchildren-viewchild-contentchildren-and-contentchild-b16c9e0358e
  //   // https://stackoverflow.com/questions/37635404/angular-2-how-to-trigger-a-method-on-a-child-from-the-parent
  //   // https://github.com/angular/material2/issues/3106
  //   // https://blog.angular-university.io/angular-viewchild/
  //   // logReview.debug("Autocomplete : ", this.matAutocomplete);
  // }

  onChange(e: any) {
    logReview.debug('Autocomplete : ', this.matAutocomplete);
    this.storage.onSessionChange(e, this.sessionFormRef.nativeElement, null, true);
  }
}

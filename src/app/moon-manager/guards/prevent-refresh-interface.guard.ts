// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { HostListener } from '@angular/core';
// inspired from : https://stackblitz.com/edit/angular-rgsa51?file=app%2Fcan-deactivate%2Fcomponent-can-deactivate.ts
// https://medium.com/front-end-hacking/angular-how-keep-user-from-lost-his-data-by-accidentally-leaving-the-page-before-submit-4eeb74420f0d
export abstract class PreventRefreshInterfaceGuard {
  abstract canDeactivate(): boolean;

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any) {
    // TODO : badly called ? not working with custom msg... well default message is meaning full enough for now...
    // https://stackoverflow.com/questions/47331260/how-to-prevent-page-refresh-in-angular-4
    let msg = 'Refreshing this page will wipe out all data. Do you have your backup ?'; //this.i18nService.translate()
    // alert(msg); // No alert will show if called from here....
    if (!this.canDeactivate()) {
      $event.returnValue = msg;
      return msg;
    }
  }
}

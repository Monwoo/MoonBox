import { Component, OnInit } from '@angular/core';
// import { I18nService } from '@app/core';
// import { LocalStorage } from '@ngx-pwa/local-storage';
import { PreventRefreshGuard } from './guards/prevent-refresh.guard';

@Component({
  selector: 'monwoo-moon-manager',
  templateUrl: './moon-manager.component.html',
  styleUrls: ['./moon-manager.component.scss']
})
export class MoonManagerComponent extends PreventRefreshGuard implements OnInit {
  // constructor() // private i18nService: I18nService,
  // // private storage: LocalStorage,
  // {}

  ngOnInit() {
    // Already saved in local storage,
    // cf : src/app/core/i18n.service.ts
    //
    // this.storage.getItem<any>('userLanguage', {}).subscribe(
    //   (language:string) => {
    //     // Called if data is valid or null
    //     console.log('Fetching userLanguage : ', language);
    //     if (language) {
    //       this.i18nService.language = language;
    //     }
    //   },
    //   error => {
    //     console.log('Fail to fetch language from local storage : ', error);
    //   }
    // );
  }
}

import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { extract } from '@app/core';
import { LocalStorage } from '@ngx-pwa/local-storage';
import { BehaviorSubject } from 'rxjs';
import { Logger } from '@app/core/logger.service';
const logReview = new Logger('MonwooReview');

@Injectable({
  providedIn: 'root'
})
export class ThemingsService {
  // TODO : generic theme plugin system ?
  currentTheme = 'mb.theme.light';
  themes = [extract('mb.theme.light'), extract('mb.theme.dark')];
  baseThemesClassInjections = {
    'mb.theme.light': 'light-theme',
    'mb.theme.dark': 'dark-theme'
  };
  currentThemeClassInjectionSubject = new BehaviorSubject<string>(this.currentTheme);

  constructor(private localStorage: LocalStorage) {
    this.localStorage.getItem<string>('current-theme').subscribe((storedTheme: string) => {
      this.setTheme(storedTheme || this.currentTheme);
    });
  }

  async setTheme(theme: string) {
    logReview.debug('Setting theme to : ', theme);
    this.currentTheme = theme;
    this.currentThemeClassInjectionSubject.next(this.baseThemesClassInjections[this.currentTheme] || '');
    return await this.localStorage.setItem('current-theme', theme).toPromise();
  }

  getCurrentThemeClassInjections() {
    return this.currentThemeClassInjectionSubject;
  }
}

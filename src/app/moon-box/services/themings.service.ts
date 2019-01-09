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
  baseThemesClassInjections = {
    'mb.theme.light': 'light-theme',
    'mb.theme.dark': 'dark-theme'
  };
  currentTheme = 'mb.theme.light';
  private currentClass = this.baseThemesClassInjections[this.currentTheme];
  themes = [extract('mb.theme.light'), extract('mb.theme.dark')];
  currentThemeClassInjectionSubject = new BehaviorSubject<string>(this.currentTheme);
  renderer: Renderer2 = null;

  constructor(private localStorage: LocalStorage, private rendererFactory: RendererFactory2) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
    this.localStorage.getItem<string>('current-theme').subscribe((storedTheme: string) => {
      this.setTheme(storedTheme || this.currentTheme);
    });
  }

  async setTheme(theme: string) {
    logReview.debug('Setting theme to : ', theme);
    const body = document.querySelector('body');
    this.renderer.removeClass(body, 'moon-box-' + this.currentClass);
    this.currentTheme = theme;
    this.currentClass = this.baseThemesClassInjections[this.currentTheme] || '';
    this.renderer.addClass(body, 'moon-box-' + this.currentClass);
    this.currentThemeClassInjectionSubject.next(this.currentClass);
    return await this.localStorage.setItem('current-theme', theme).toPromise();
  }

  getCurrentThemeClassInjections() {
    return this.currentThemeClassInjectionSubject;
  }
}

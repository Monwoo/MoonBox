// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Inject, Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { Logger } from '@app/core/logger.service';
const logReview = new Logger('MonwooReview');

@Injectable({
  providedIn: 'root'
})
export class LoadingLoaderService {
  _ll: any = null;
  renderer: Renderer2 = null;
  isShown = false;
  loadingLock = 0;
  // discreteTimeout = 3000

  constructor(
    private rendererFactory: RendererFactory2 // @Inject(DOCUMENT) private document,
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this._ll = document.querySelector('.loading-loader');
    const compatibilityView = document.querySelector('.compatibility-review');
    this.renderer.addClass(compatibilityView, 'off');
    this.isShown = !document.querySelector('.loading-loader.off');

    // this.renderer.listen(ll, 'click', console.log);
  }

  public showLoader() {
    if (!this.isShown) {
      this.renderer.removeClass(this._ll, 'off');
      this.isShown = true;
    }
  }

  public hideLoader() {
    if (this.loadingLock) {
      logReview.debug('Ignoring loader hide since having loading locks at : ', this.loadingLock);
      return;
    }

    if (this.isShown) {
      this.renderer.addClass(this._ll, 'off');
      this.isShown = false;
    }
  }
  // if you call requireLoadingLock, you will need to ensure releaseLoadingLock is called for balancing that call
  public requireLoadingLock() {
    this.loadingLock++;
    this.showLoader();
  }
  public releaseLoadingLock() {
    if (0 === this.loadingLock) {
      logReview.warn('Having buggy relaseLoadingLock since loading lock count is already at 0 ...');
      return;
    }
    this.loadingLock--;
    if (0 === this.loadingLock) {
      this.hideLoader();
    }
  }
}

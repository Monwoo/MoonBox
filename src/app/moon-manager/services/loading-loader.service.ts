// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Inject, Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingLoaderService {
  _ll: any = null;
  renderer: Renderer2 = null;
  isShown = false;
  // discreteTimeout = 3000

  constructor(
    private rendererFactory: RendererFactory2 // @Inject(DOCUMENT) private document,
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    this._ll = document.querySelector('.loading-loader');
    this.isShown = !document.querySelector('.loading-loader.off');
    const compatibilityView = document.querySelector('.compatibility-review');
    this.renderer.addClass(compatibilityView, 'off');

    // this.renderer.listen(ll, 'click', console.log);
  }

  public showLoader() {
    if (!this.isShown) {
      this.renderer.removeClass(this._ll, 'off');
      this.isShown = true;
    }
  }

  public hideLoader() {
    if (this.isShown) {
      this.renderer.addClass(this._ll, 'off');
      this.isShown = false;
    }
  }
}

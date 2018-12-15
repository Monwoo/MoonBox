// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Pipe, PipeTransform } from '@angular/core';
// https://gist.github.com/Bloggerschmidt/d1c635a9d8ca6d2d8804a16822b72e4e
// https://stackoverflow.com/questions/39857858/angular-2-domsanitizer-bypasssecuritytrusthtml-svg
// https://medium.com/@swarnakishore/angular-safe-pipe-implementation-to-bypass-domsanitizer-stripping-out-content-c1bf0f1cc36b
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'safeHtml'
})
export class SafeHtmlPipe implements PipeTransform {
  constructor(private _sanitizer: DomSanitizer) {}
  transform(v: any, args?: any): SafeHtml {
    return this._sanitizer.bypassSecurityTrustHtml(v);
  }
}

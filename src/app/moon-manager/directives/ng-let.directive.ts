import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
// https://medium.com/@AustinMatherne/angular-let-directive-a168d4248138
interface LetContext<T> {
  ngLet: T;
}

@Directive({
  selector: '[ngLet]'
})
export class NgLetDirective<T> {
  private _context: LetContext<T> = { ngLet: null };

  constructor(_viewContainer: ViewContainerRef, _templateRef: TemplateRef<LetContext<T>>) {
    _viewContainer.createEmbeddedView(_templateRef, this._context);
  }

  @Input()
  set ngLet(value: T) {
    this._context.ngLet = value;
  }
}

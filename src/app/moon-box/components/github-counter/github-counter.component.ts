import { Component, OnInit, ChangeDetectionStrategy, Input } from '@angular/core';
import { NtkmeCounterComponent } from '@ctrl/ngx-github-buttons';

// https://coryrylan.com/blog/angular-component-inheritance-and-template-swapping
// TODO : fail to import NtkmeCounterComponent => so overwite, but mendatory to set template....
// => wich way to inject it instead of ovewrites ?
// (if added to module, will complain component is already registred in another module...)
// https://github.com/TypeCtrl/ngx-github-buttons/blob/master/src/lib/ntkme/ntkme.module.ts
// https://github.com/TypeCtrl/ngx-github-buttons/blob/master/src/lib/ntkme/ntkme.component.ts
@Component({
  selector: 'moon-box-github-counter',
  templateUrl: './github-counter.component.html',
  styleUrls: ['./github-counter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GithubCounterComponent extends NtkmeCounterComponent {
  @Input() large = false;
  @Input() count: number;
  @Input() counterLabel: string;
  @Input() counterHref: string;
}

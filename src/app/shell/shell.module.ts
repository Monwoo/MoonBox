import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { ShellComponent } from './shell.component';
import { HeaderComponent } from './header/header.component';
import { MonwooMoonManagerWrapModule } from '@moon-manager/monwoo-moon-manager-wrap.module';
import { MonwooMoonBoxWrapModule } from '@moon-box/monwoo-moon-box-wrap.module';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    NgbModule,
    RouterModule,
    MonwooMoonManagerWrapModule,
    MonwooMoonBoxWrapModule
  ],
  declarations: [HeaderComponent, ShellComponent]
})
export class ShellModule {}

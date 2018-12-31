import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoonBoxComponent } from '@moon-box/moon-box.component';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { MonwooMoonManagerWrapModule } from '@moon-manager/monwoo-moon-manager-wrap.module';

@NgModule({
  declarations: [MoonBoxComponent, HeaderComponent, FooterComponent],
  imports: [CommonModule, MonwooMoonManagerWrapModule],
  exports: [MoonBoxComponent, MonwooMoonManagerWrapModule]
})
export class MonwooMoonBoxWrapModule {}

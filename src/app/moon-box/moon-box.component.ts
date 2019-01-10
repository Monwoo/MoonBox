// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com
import { Component, OnInit, ComponentFactoryResolver, ViewChild, ViewEncapsulation } from '@angular/core';
import { LoadingLoaderService } from '@moon-manager/services/loading-loader.service';
import { ThemingsService } from '@moon-box/services/themings.service';
// import { LockScreenComponent } from '@moon-box/components/lock-screen/lock-screen.component';
import { NotificationsBufferService } from '@moon-box/services/notifications-buffer.service';
import { MessagesService } from '@moon-box/services/messages.service';
import { BackendService } from '@moon-box/services/backend.service';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';

@Component({
  selector: 'monwoo-moon-box',
  templateUrl: './moon-box.component.html',
  styleUrls: ['./moon-box.component.scss'],
  // https://angular.io/api/core/ViewEncapsulation
  // encapsulation: ViewEncapsulation.ShadowDom,
  encapsulation: ViewEncapsulation.None
})
export class MoonBoxComponent implements OnInit {
  // @ViewChild('lockScreenContainer') lockScreenContainer: any;

  constructor(
    private ll: LoadingLoaderService,
    private factoryResolver: ComponentFactoryResolver,
    public themings: ThemingsService,
    // Hack to avoid missing notif listenings since otherwise,
    // service will be setup only if going to parameters tab, not
    // registering early events from main page....
    public hackUntilLoadModuleLevelFail: NotificationsBufferService,
    public hack2UntilLoadModuleLevelFail: MessagesService,
    public hack4UntilLoadModuleLevelFail: BackendService,
    public hack5UntilLoadModuleLevelFail: SecuStorageService
  ) {
    ll.hideLoader();
  }

  ngOnInit() {
    // this.addLockScreenComponent();
  }

  // addLockScreenComponent() {
  //   const factory = this.factoryResolver.resolveComponentFactory(LockScreenComponent);
  //   const component = factory.create(this.lockScreenContainer.parentInjector);
  //   this.lockScreenContainer.insert(component.hostView);
  // }
}

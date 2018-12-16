// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com
import { Component, OnInit, ComponentFactoryResolver, ViewChild } from '@angular/core';
import { LoadingLoaderService } from '@moon-manager/services/loading-loader.service';
// import { LockScreenComponent } from '@moon-box/components/lock-screen/lock-screen.component';

@Component({
  selector: 'monwoo-moon-box',
  templateUrl: './moon-box.component.html',
  styleUrls: ['./moon-box.component.scss']
})
export class MoonBoxComponent implements OnInit {
  // @ViewChild('lockScreenContainer') lockScreenContainer: any;

  constructor(private ll: LoadingLoaderService, private factoryResolver: ComponentFactoryResolver) {
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

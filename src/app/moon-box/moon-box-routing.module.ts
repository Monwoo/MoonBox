// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Shell } from '@app/shell/shell.service';

// https://angular.io/api/router/CanActivate
// https://www.concretepage.com/angular-2/angular-2-4-route-guards-canactivate-and-canactivatechild-example
import { RoutingSentinelService } from '@moon-manager/services/routing-sentinel.service';
// import { PreventRefreshGuard } from './guards/prevent-refresh.guard';
import { BackendCanActivateService } from '@moon-box/services/backend-can-activate.service';
import { FirstPageComponent } from '@moon-box/components/first-page/first-page.component';
import { BoxesComponent } from '@moon-box/components/boxes/boxes.component';
import { ParametersComponent } from '@moon-box/components/parameters/parameters.component';
// import { AFrameTutorialComponent } from './components/aframe-tutorial/aframe-tutorial.component';

// https://www.bennadel.com/blog/3400-wildcard-routes-can-be-scoped-to-route-sub-trees-in-angular-5-1-3.htm
// https://dzone.com/articles/angular-router-empty-paths-componentless-routes-an
// https://stackoverflow.com/questions/43488480/exclude-specific-path-from-routing-in-angular-2

const routes: Routes = [
  Shell.childRoutes([
    // Catching all routes for V1. TODO : Arrange as you like...
    {
      path: 'param',
      component: ParametersComponent,
      pathMatch: 'full',
      canActivate: [RoutingSentinelService]
      // canDeactivate: [PreventRefreshGuard],
    },
    // {
    //   path: 'tutorial',
    //   component: AFrameTutorialComponent,
    //   pathMatch: 'full',
    //   canActivate: [RoutingSentinelService],
    // },
    // Catching all routes for V1. TODO : Arrange as you like...
    // {
    //   path: 'backend**', // No luck => only work in embed routes, alone : only '**' works...
    //   // cf : https://stackoverflow.com/questions/43488480/exclude-specific-path-from-routing-in-angular-2
    //   // https://stackoverflow.com/questions/36277506/prevent-routing-in-angular-when-user-manually-changes-url-in-browser-tab
    //   redirectTo: '#fakeRedirectHack',
    //   pathMatch: 'full',
    //   canActivate: [BackendCanActivateService]
    //   // canDeactivate: [PreventRefreshGuard],
    // },
    {
      // https://stackoverflow.com/questions/43488480/exclude-specific-path-from-routing-in-angular-2
      // path: '**', // => TODO : find solution for transparent routes or missing some expected design pattern ?
      path: '',
      // component: BoxesComponent,
      component: FirstPageComponent,
      pathMatch: 'full',
      canActivate: [RoutingSentinelService]
      // canDeactivate: [PreventRefreshGuard],
    }
  ])
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: []
})
export class MoonBoxRoutingModule {}

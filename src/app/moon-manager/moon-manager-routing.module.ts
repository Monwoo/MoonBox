// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Shell } from '@app/shell/shell.service';

// https://angular.io/api/router/CanActivate
// https://www.concretepage.com/angular-2/angular-2-4-route-guards-canactivate-and-canactivatechild-example
import { RoutingSentinelService } from './services/routing-sentinel.service';
// import { PreventRefreshGuard } from './guards/prevent-refresh.guard';
import { BodyComponent } from './components/body/body.component';
import { ParametersComponent } from './components/parameters/parameters.component';
// import { AFrameTutorialComponent } from './components/aframe-tutorial/aframe-tutorial.component';

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
    {
      // https://stackoverflow.com/questions/43488480/exclude-specific-path-from-routing-in-angular-2
      // path: '**', // => TODO : find solution for transparent routes or missing some expected design pattern ?
      path: '',
      component: BodyComponent,
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
export class MoonManagerRoutingModule {}

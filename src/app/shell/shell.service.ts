import { Routes, Route } from '@angular/router';

// import { AuthenticationGuard } from '@app/core';
import { RoutingSentinelService } from '../moon-manager/services/routing-sentinel.service';
import { ShellComponent } from './shell.component';
import { PreventRefreshGuard } from '../moon-manager/guards/prevent-refresh.guard';

/**
 * Provides helper methods to create routes.
 */
export class Shell {
  /**
   * Creates routes using the shell component and authentication.
   * @param routes The routes to add.
   * @return The new route using shell as the base.
   */
  static childRoutes(routes: Routes): Route {
    return {
      path: '',
      component: ShellComponent,
      children: routes,
      canActivate: [RoutingSentinelService], // TODO : AuthenticationGuard should be overwrittend by RoutingSentinelService in sub modules Only...
      canDeactivate: [PreventRefreshGuard],
      // Reuse ShellComponent instance when navigating between child views
      data: { reuse: true }
    };
  }
}

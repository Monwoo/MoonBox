// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

// https://www.concretepage.com/angular-2/angular-2-4-route-guards-canactivate-and-canactivatechild-example

@Injectable({
  providedIn: 'root'
})
export class BackendCanActivateService implements CanActivate {
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return false; // let default backend server serve ? Trying to do transparent routings....
  }
}

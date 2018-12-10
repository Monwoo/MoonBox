// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

// inspired from :
// https://www.bennadel.com/blog/3043-providing-default-values-for-the-safe-navigation-operator-in-angular-2-beta-8.htm

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'default'
})
export class DefaultPipe implements PipeTransform {
  transform(value: any, args?: any): any {
    if ((typeof value === 'undefined' || value === null) && args.length) {
      return typeof args === 'string' ? args : args[0];
    } else {
      return value;
    }
  }
}

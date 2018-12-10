import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hasType'
})
export class HasTypePipe implements PipeTransform {
  transform(value: any, args?: any): any {
    const targetType = typeof args === 'string' ? args : args[0];
    return typeof value === targetType;
  }
}

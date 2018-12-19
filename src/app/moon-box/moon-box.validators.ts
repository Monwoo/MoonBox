// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

// Inspired from :
// https://github.com/udos86/ng-dynamic-forms/blob/master/sample/app/app.validators.ts

import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Logger } from '@app/core/logger.service';
const logReview = new Logger('MonwooReview');

export function customValidator(control: AbstractControl): ValidationErrors | null {
  let hasError = false; // control.value ? (control.value as string).startsWith("abc") : false;

  if (hasError) logReview.debug('Custom Validator error');
  return hasError ? { customValidator: true } : null;
}

export function customDateRangeValidator(group: FormGroup): ValidationErrors | null {
  let hasError = false;

  try {
    let fetchStart = group.get('fetchStart').value as Date,
      fetchEnd = group.get('fetchEnd').value as Date;

    if (fetchStart && fetchEnd) {
      hasError = fetchStart >= fetchEnd || fetchEnd <= fetchStart;
    }
  } catch (error) {}

  if (hasError) logReview.debug('Custom Date range error');
  return hasError ? { customDateRangeValidator: true } : null;
}

export function customForbiddenValidator(forbiddenValue: string): ValidatorFn {
  console.log('Custom forbidden');

  return (control: AbstractControl): ValidationErrors | null => {
    if (control && control.value === forbiddenValue) {
      logReview.debug('Custom Forbiden validator error');
      return { forbidden: true };
    }
    return null;
  };
}

export function customAsyncFormGroupValidator(formGroup: FormGroup): Promise<ValidationErrors | null> {
  return new Promise((resolve, reject) => {
    logReview.debug('Custom Async validator');
    resolve(null);
  });
}

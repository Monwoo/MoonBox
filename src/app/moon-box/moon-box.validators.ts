// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

// Inspired from :
// https://github.com/udos86/ng-dynamic-forms/blob/master/sample/app/app.validators.ts

import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

export function customValidator(control: AbstractControl): ValidationErrors | null {
  console.log('Custom Validator');

  let hasError = false; // control.value ? (control.value as string).startsWith("abc") : false;

  return hasError ? { customValidator: true } : null;
}

export function customDateRangeValidator(group: FormGroup): ValidationErrors | null {
  console.log('Custom Date range');
  let hasError = false;

  try {
    let fetchStart = group.get('fetchStart').value as Date,
      fetchEnd = group.get('fetchEnd').value as Date;

    if (fetchStart && fetchEnd) {
      hasError = fetchStart >= fetchEnd || fetchEnd <= fetchStart;
    }
  } catch (error) {}

  return hasError ? { customDateRangeValidator: true } : null;
}

export function customForbiddenValidator(forbiddenValue: string): ValidatorFn {
  console.log('Custom forbidden');

  return (control: AbstractControl): ValidationErrors | null => {
    if (control && control.value === forbiddenValue) {
      return { forbidden: true };
    }

    return null;
  };
}

export function customAsyncFormGroupValidator(formGroup: FormGroup): Promise<ValidationErrors | null> {
  return new Promise((resolve, reject) => {
    console.log('async validation');
    resolve(null);
  });
}

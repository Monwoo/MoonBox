// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
// `.env.ts` is generated by the `npm run env` command
import env from './.env';
//import { extract } from '@app/core'; <- give circular dependencies warning....
// export let extract = (x:any) => (x);
export const environment = {
  production: true,
  version: env.npm_package_version,
  serverUrl: '',
  moonBoxFrontendUrl: 'https://www.monwoo.com/MoonBox/Demo',
  moonBoxFrontendDomain: 'www.monwoo.com',
  moonBoxBackendUrl: 'https://www.monwoo.com/MoonBox/_Demo/backend',
  moonBoxBackendDomain: 'www.monwoo.com',
  moonBoxBackendBasePath: '../_Demo/backend/',
  defaultLanguage: 'fr-FR',
  supportedLanguages: ['fr-FR', 'en-US'],
  clientSecret: 'sl8u85wiqrk9lon',
  jwtAllowedDomains: ['www.monwoo.com', 'www.monwoo.fr', 'monwoo.com', 'monwoo.fr']
};
/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.

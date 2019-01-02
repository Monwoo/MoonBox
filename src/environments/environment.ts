// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
// `.env.ts` is generated by the `npm run env` command
import env from './.env';
//import { extract } from '@app/core'; <- give circular dependencies warning....
// export let extract = (x:any) => (x);
export const environment = {
  production: false,
  version: env.npm_package_version + '-dev',
  // serverUrl: '/api',
  serverUrl: '/',
  moonBoxFrontendUrl: 'http://localhost:4200',
  moonBoxFrontendDomain: 'localhost',
  moonBoxBackendUrl: 'http://localhost:6901',
  moonBoxBackendDomain: 'localhost',
  moonBoxBackendBasePath: '/',
  defaultLanguage: 'fr-FR',
  supportedLanguages: ['fr-FR', 'en-US'],
  clientSecret: '7d7jls866znk1g1',
  jwtAllowedDomains: ['localhost:6901', '127.0.0.1:6901', '[::1]:6901']
};
/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.

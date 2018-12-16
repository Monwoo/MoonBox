/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 *
 * This file is divided into 2 sections:
 *   1. Browser polyfills. These are applied before loading ZoneJS and are sorted by browsers.
 *   2. Application imports. Files imported after ZoneJS that should be loaded before your main
 *      file.
 *
 * The current setup is for so-called "evergreen" browsers; the last versions of browsers that
 * automatically update themselves. This includes Safari >= 10, Chrome >= 55 (including Opera),
 * Edge >= 13 on the desktop, and iOS 10 and Chrome on mobile.
 *
 * Learn more in https://angular.io/guide/browser-support
 */

/***************************************************************************************************
 * BROWSER POLYFILLS
 */

/** IE9, IE10 and IE11 requires all of the following polyfills. */
// import 'core-js/es6/symbol';
// import 'core-js/es6/object';
// import 'core-js/es6/function';
// import 'core-js/es6/parse-int';
// import 'core-js/es6/parse-float';
// import 'core-js/es6/number';
// import 'core-js/es6/math';
// import 'core-js/es6/string';
// import 'core-js/es6/date';
// import 'core-js/es6/array';
// import 'core-js/es6/regexp';
// import 'core-js/es6/map';
// import 'core-js/es6/weak-map';
// import 'core-js/es6/set';

/**
 * If the application will be indexed by Google Search, the following is required.
 * Googlebot uses a renderer based on Chrome 41.
 * https://developers.google.com/search/docs/guides/rendering
 */
// import 'core-js/es6/array';

/** IE10 and IE11 requires the following for NgClass support on SVG elements */
// import 'classlist.js';  // Run `npm install --save classlist.js`.

/** IE10 and IE11 requires the following for the Reflect API. */
// import 'core-js/es6/reflect';

/**
 * Web Animations `@angular/platform-browser/animations`
 * Only required if AnimationBuilder is used within the application and using IE/Edge or Safari.
 * Standard animation support in Angular DOES NOT require any polyfills (as of Angular 6.0).
 */
// import 'web-animations-js';  // Run `npm install --save web-animations-js`.

/**
 * By default, zone.js will patch all possible macroTask and DomEvents
 * user can disable parts of macroTask/DomEvents patch by setting following flags
 */

// (window as any).__Zone_disable_requestAnimationFrame = true; // disable patch requestAnimationFrame
// (window as any).__Zone_disable_on_property = true; // disable patch onProperty such as onclick
// (window as any).__zone_symbol__BLACK_LISTED_EVENTS = ['scroll', 'mousemove']; // disable patch specified eventNames

/*
 * in IE/Edge developer tools, the addEventListener will also be wrapped by zone.js
 * with the following flag, it will bypass `zone.js` patch for IE/Edge
 */
// (window as any).__Zone_enable_cross_context_check = true;
import 'core-js/es6/reflect';
import 'core-js/es7/reflect';

// https://github.com/brakmic/Angular-VR-Starter/blob/master/src/init/polyfills.browser.ts#L4
// import 'aframe'; // MUST import A-Frame before zone.js!

// TODO : importe all over here ? ccapture is inculded with angular.json , so need polyfill before it...
// done via angular.json for now... : good effect : no more error about missing fs module...
// import 'webp-hero/dist/webp-hero.polyfill.bundle.js';

// Webp-hero is not doing polyfill, just providing equivalent way.
// below is polyfill for ccapture.js to work :
// https://github.com/chase-moskal/webp-hero/blob/master/source/webp-hero.ts
// https://github.com/spite/ccapture.js/blob/master/src/CCapture.js
// if(typeof HTMLCanvasElement.prototype.filter !== "function") {
/*
var _testCanvas = document.createElement('canvas');
// // src/platform/polyfills/weppy-master/weppy.js => done via angular js, webp-hero is not injecting any ref...
import 'platform/polyfills/canvas/modernizr-custom.js';
if (_testCanvas.toDataURL('image/webp').substr(5, 10) !== 'image/webp') {
  const parentToDataUrl = HTMLCanvasElement.prototype.toDataURL;
  console.log('TODO : webpPolyfill...');
  HTMLCanvasElement.prototype.toDataURL = function(type?: string, quality?: any) {
    if ('image/webp' === type) {
      return 'TODO-image/webp';
    }
    return parentToDataUrl.call(this, type, quality);
  };
}
*/
/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js/dist/zone'; // Included with Angular CLI.

/***************************************************************************************************
 * APPLICATION IMPORTS
 */
// import 'hammerjs'; // already included via angular.json

// import 'web-animations-js';

// Apple Safari `requestAnimationFrame` polyfills
// import requestFrame from '../platform/polyfills/request-frame-alt';
// requestFrame('native');

import { environment } from '@env/environment';
declare const require: any; // To avoid typeScript error about require that don't exist since it's webpack level

if (environment.production) {
  // Production
} else {
  // Development
  /* tslint:disable no-var-requires */
  // require('zone.js/dist/long-stack-trace-zone');
  require('zone.js/dist/long-stack-trace-zone');
  // Error.stackTraceLimit = Infinity;
}

**Bibliographie build by (put your credits below if you improve it) :**

- Miguel Monwoo (service@monwoo.com)

**---**

- https://github.com/emailjs/emailjs-imap-client
- https://developers.google.com/gmail/api/downloads
- https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/gapi.client.gmail
- https://www.npmjs.com/package/googleapis
- https://www.npmjs.com/package/emailjs-imap-handler
- https://emailjs.org/
- http://tphangout.com/angular-2-sending-mails-from-your-app/
- https://github.com/microsoft/typescript/issues/3019
- https://github.com/Microsoft/TypeScript/issues/15031
- http://definitelytyped.org/
- https://github.com/teppeis/closure-ts
- https://www.stevefenton.co.uk/2013/01/complex-typescript-definitions-made-easy/

- https://github.com/emailjs/emailjs-tcp-socket/issues/31
- https://github.com/webpack-contrib/imports-loader#disable-amd
- https://github.com/Axel186/emailjs-and-webpack-example/blob/master/webpack.config.js
- https://github.com/emailjs/emailjs-imap-client/blob/master/src/client.js

- https://github.com/webpack-contrib/polymer-webpack-loader
- https://github.com/vuejs/vue-loader
- https://github.com/TheLarkInn/angular2-template-loader

- https://www.npmjs.com/package/wdio
- https://ramdajs.com/
- https://medium.com/@emandm/import-mocking-with-typescript-3224804bb614
- https://github.com/webpack-contrib/css-loader/issues/447
- https://stackoverflow.com/questions/40226406/webpack-built-typescript-files-modules-are-empty-objects
- https://github.com/TypeStrong/ts-node#mocha
- https://medium.com/@emandm/import-mocking-with-typescript-3224804bb614

- https://github.com/emailjs/emailjs-tcp-socket/issues/17
- https://github.com/emailjs/emailjs-tcp-socket/blob/master/README.md
- https://groups.google.com/forum/#!topic/emailjs/x9xGu2xHrbE

- https://developer.chrome.com/apps/socket
- https://developer.chrome.com/apps/sockets_tcp
- https://developer.chrome.com/apps/manifest/sockets

- https://www.npmjs.com/package/tls-browserify
- https://github.com/emersion/tls-browserify
- https://www.npmjs.com/package/browserify-sign
- https://www.npmjs.com/package/net-browserify

- https://silex.symfony.com/

```bash
# Added packages :
yarn add emailjs-imap-client imports-loader net-browserify tls-browserify



# Backend side (Warning : will need Internet to connect to your client...)
mkdir backend && cd backend
# alias php=/Applications/MAMP/bin/php/php5.6.7/bin/php => use php > 7.1
export PATH=/Applications/MAMP/bin/php/php7.1.8/bin:$PATH
curl -sS https://getcomposer.org/installer | php
alias composer='php composer.phar'
composer init --name "monwoo/moon-box-backend" --type "project" \
--description "Backend for Monwoo's Moon Box" \
--author "Miguel Monwoo <service@monwoo.com>" \
--homepage "https://github.com/Monwoo/MoonBox" --stability "dev" \
--license "MIT, Copyrights Monwoo 2018, service@monwwo.com"

composer require 'silex/silex:^2.0' 'cnam/security-jwt-service-provider:2.*'

# Launch dev server :
php -eS localhost:6901


```

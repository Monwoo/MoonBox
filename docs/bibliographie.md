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
- https://github.com/auth0/angular2-jwt
- https://github.com/cnam/security-jwt-service-provider
- https://angular.io/guide/http

- https://github.com/angular/angular/issues/22492
- https://stackoverflow.com/questions/36353532/angular2-options-method-sent-when-asking-for-http-get
- https://stackoverflow.com/questions/1256593/why-am-i-getting-an-options-request-instead-of-a-get-request
- http://restlet.com/company/blog/2015/12/15/understanding-and-using-cors/
- https://stackoverflow.com/questions/35588699/response-to-preflight-request-doesnt-pass-access-control-check

- https://github.com/silexphp/Silex-Providers/blob/master/MonologServiceProvider.php
- https://symfony.com/doc/current/components/filesystem.html
- https://github.com/Seldaek/monolog/blob/master/src/Monolog/Logger.php
- https://github.com/symfony/symfony/blob/4.2/src/Symfony/Component/HttpKernel/Log/Logger.php

- https://blog.angular-university.io/angular-http/
- https://www.learnrxjs.io/operators/transformation/pluck.html
- https://www.learnrxjs.io/operators/combination/forkjoin.html

- http://zacstewart.com/2012/04/14/http-options-method.html
- https://developer.mozilla.org/fr/docs/Glossaire/requete_pre-verification

```bash
# Added packages :
yarn add emailjs-imap-client imports-loader net-browserify tls-browserify
yarn add @auth0/angular-jwt


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
php -eS localhost:6901 &
cd -
(cd backend && php -eS localhost:6901)

# after changing autoload param in composer.json :
(cd backend && composer dump-autoload)

# add some packages :
(cd backend && composer require monolog/monolog symfony/yaml \ symfony/monolog-bridge symfony/filesystem)

# clean all and rebuild :
rm -rf backend/vendor && (cd backend && composer install)

```

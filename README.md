# MoonBox

![alt logo MoonBox](https://raw.githubusercontent.com/monwoo/MoonBox/master/src/assets/logos/MoonBox-128.png) ![alt logo MoonBox Secondary](https://raw.githubusercontent.com/monwoo/MoonBox/master/src/assets/logos/MoonBox-64-secondary.png)

**MoonBox by Monwoo : Centralize your mailboxes, go above notifications, etc...**

![alt logo Monwoo](https://www.monwoo.com/LogoMonwoo-64.png)
Timely funded and founded by Monwoo 2018.
Financé temporellement et fondé par Monwoo 2018.

Démo : https://www.monwoo.com/MoonBox/Demo/ (Comming soon)

Attention : démo v1.0.0 testé humainement uniquement. Pour limiter les risques, utilisez l'outil depuis un onglet de navigation privée.

Warning : démo v1.0.0 testé humainement uniquement. Pour limiter les risques, utilisez l'outil depuis un onglet de navigation privée.

#### FR

Objectif centralisation :

- des emails (En cours de développement)
- des notifications business (En cours de développement)

#### EN

Centralized place for :

- emails (Coding in progress, comming soon)
- business notifications (Coding in progress, comming soon)

# → Quick Documentation

## Viable targets :

This project use some advanced API to work fully.
We're using it under last Chrome webbrowser for now.
It may work under others, but we did not get time to try to ensure all polyfill for browsers that may support it.

## Install project :

```bash
# installing dependencies from package.json :
yarn install
# start dev server :
yarn start
# start dev server in production mode (for prod debug only)
# use 'yarn run build' for real production builds in /dist folder, cf below
yarn start --prod

# Extract strings from code and templates to src/app/translations/template.json :
yarn run translations:extract # Generate template.json
# For this process to work inside ts files, you need to always
# use extract('your string') in your .ts file :
#   import { extract } from '@app/core';

# For generating by copy from json translated file :
# "(.*)": "",
# Replace with :
# "$1": "$1",

# play with generate commands :
yarn run generate class moon-box/services/MyService --project=monwoo-moon-box --spec=true --type='FormClass.model'

# Display project documentation :
yarn run docs

# Run another doc generator tool :
# echo '{
#   "source": "./src",
#   "destination": "./es-docs",
#   "plugins": [{"name": "esdoc-standard-plugin"}]
# }' > .esdoc.json
./node_modules/.bin/esdoc

# Running tests via Karma in watch mode for it to launch on each change you do to the code
# Nice to be run with dev server if you wanna do some tests driven developpments in real time :
yarn test

# running tests for continous integration (will test all only once) :
yarn run test:ci

# export dev project as Zip file :
git archive --format=zip -o ~/goinfre/MonwooMoonBox.zip HEAD

# Ajusts manifest to setup Prod base url (TODO : from env file ? + same for proxy...)
# https://developers.google.com/web/fundamentals/web-app-manifest/
# emacs src/manifest.json
# => DO NOT ADD version to manifest.json web serveur URLS to allow multi-PWA on same domain
# Better to ajust version of Manifest in index.html instead (hoping all will reload well)
emacs src/index.html

# build productions file in dist folder with correct base-href for deploy :
yarn run build --base-href '/MoonBox/Demo/'

# + : if you deploy frontent and backend on same server, and backend is injectable in
# your source build, then you can ajust accordingly :
#    "src/backend"
# for file : angular.json
# => in assets path config, to let backend's routes goes up to the backend in PWA navigations ?
# Well, not fully our backend model style, having subrouting on only one real asset file...
# So Did try to add transparent routings for it in :
# src/app/moon-box/moon-box-routing.module.ts

# You may also need to configure your redirects URIs for all your social Auth accounts :
# Google Api => https://console.developers.google.com
# => Don't forget to re-download json credential file on any change,
# since json will need to duplicate your change to fully work...
# Facebook Api => https://developers.facebook.com

# avoid commit productions files to dev repo by reverting them :
git checkout HEAD src/environments/environment.ts
# zip result for Production Software delivery :
zip -r "MoonBox-Prod.zip" dist

# ensure you use php > 7.1
export PATH=/Applications/MAMP/bin/php/php7.1.8/bin:$PATH
# add dependencies to backend :
(cd backend && composer require  symfony/process)
# downgrade specific components for compatibility purpose :
(cd backend && composer require 'symfony/process:^3.4')
# install backend dependencies :
(cd backend && composer install)
# run backend server for developpment :
(cd backend && php -eS localhost:6901)
# build production zip archive in build folder :
php -d phar.readonly=0 backend/Monwoo/bin/console -vvv moon-box:install -c false

# For quality over versions release, need to use preprod env to checks all tests are OK
# under similar domaine names configuration as real prod :
# https://github.com/angular/angular-cli/issues/10612
# Buid frontend as prod with dev configs to keep debug in transpiled preprod :
rm -rf dist; ng build --configuration=preprod --base-href '/dist/'
# clean backend build folder, to avoid cmd old path issue or too fast copy/past cmds :
rm -rf backend/build/*
# Install deps by copy of dev src to keep debug in preprod + ask for preprod configuration :
# php -d phar.readonly=0 backend/Monwoo/bin/console -vvv moon-box:install -c '' -d true -e 'preprod'
# same as above, with optimized vendors files :
php -d phar.readonly=0 backend/Monwoo/bin/console -vvv moon-box:install -c false -d true -e 'preprod'
# Link builded preprod
(cd dist && ln -s ../backend/build/lastBuild backend)
(cd dist && cp ../backend/client_secret.dev.json backend)

# start webserver for front and back at same time :
php -eS localhost:6901

# or simply check without frontend prod optim and phar building :
# => PS : compiler.js:2427 Uncaught Error: Can't resolve all parameters for LockScreenComponent:
# => you're the dev, be strong and solve this bug before using it, or use preprod version :
rm -rf dist; ng build --configuration=devpreprod --base-href '/dist/'
(cd dist && ln -s ../backend backend)
php -eS localhost:6901



```

## For advanced documentation :

You're the documentation. To learn it, you can start by learning all usages of https://github.com/Monwoo/MoonManager, and then, code will be self explanatory.

MoonBox is simply some configuration and some more stuffs added to it.

# → Livre d'or des métiers

**Ci-dessous l'annuaire des métiers ayant des compétances d'usages du MoonBox :**

---

**Monwoo (service@monwoo.com) :** Utilisé par Monwoo.

---

> Ps : n'hésitez pas à rajoutez votre carte business ci-dessus si vous avez un usage métier de la MoonBox.

# → Bibliographie et veilles :

[Développment stuffs (click me)](docs/bibliographie.md)

---

<details>
<summary>Pushing to this repo :</summary>

- https://help.github.com/articles/duplicating-a-repository/
- https://help.github.com/articles/fork-a-repo/
- https://gist.github.com/jacquesd/85097472043b697ab57ba1b1c7530274
- https://help.github.com/articles/creating-a-pull-request-from-a-fork/
- https://help.github.com/articles/about-forks/
- https://www.gun.io/blog/how-to-github-fork-branch-and-pull-request

**Wysiwyg Fork with www.github.com :**
Forking a repository is a simple two-step process. We've created a repository for you to practice with!
On GitHub, navigate to the Monwoo/MoonBox repository.
Look for the Fork button In the top-right corner of the page, click Fork.
That's it! Now, you have a fork of the original Monwoo/MoonBox repository.

**Manual Fork with your command line :**

```bash
# clone original repo with bare option :
git clone --bare https://github.com/Monwoo/MoonBox.git
# create you own repo with your custom git tool, then minor push the original one :
cd MoonBox
git remote add --track master upstream <your custom repo push url>
# cleaning original repo :
cd .. && rm -rf MoonBox
git clone <your custom repo push url>
cd <your clonned folder>
# If you want, add the original repo as remote to fetch (potential) future changes.
# Make sure you also disable push on the remote (as you are not allowed to push to it anyway).
git remote add upstream <your custom repo push url>
git remote set-url --push upstream DISABLE
# When you push, do so on origin with :
git push origin
# When you want to pull changes from upstream you can just fetch the remote
# and rebase on top of your work + fix conflicts if any :
git fetch upstream
git rebase upstream/master
```

**Now you're getting ready to start :**
You'll want to switch off of the 'master' branch and onto a different branch for your new feature. It's important to do this because you can only have one Pull Request per branch, so if you want to submit more than one fix, you'll need to have multiple branches. Make a new branch like this:

```bash
git branch newfeature
```

Then switch to it like this:

```bash
git checkout newfeature
```

Now you're on your new branch. You can confirm this by simply typing :

```bash
git branch
# check local branches AND remotes branches :
git branch -a

# Add a version tag :
git tag -a v1.0.0-HumanlyTested -m "v1.0.0 Humanly tested by Miguel Monwoo"
# Push all local tags to remote :
git push origin --tags
```

</details>

---

# → Credits

Please, if you push to my repo, add your crédits below with a short description :

---

**2018/12/10 :** D'après une idée de M. Miguel Monwoo.

---

**2018/12/10 :** MoonBox commence avec pour base : https://github.com/Monwoo/MoonManager

---

### Liked it? Give it a star 🌟, Moon will love it :). If not, please help us woo it.

// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Injectable } from '@angular/core';
import { I18nService } from '@app/core';
import { ConfigType, configDefaults } from './config-form.model';
import { LocalStorage } from '@ngx-pwa/local-storage';

import { Store, select } from '@ngrx/store';
import { Observable } from 'rxjs';
import { MediasActionTypes, MediasActionsUnion, SetMedias, AddMedias } from './medias-buffer.actions';
import { Md5 } from 'ts-md5/dist/md5';

export type Media = {
  index: string; // Used to target media from html templates
  dataUrl: string; // Used to display image data (Huges strings...)
  pathLookup: string; // Used to avoid reloadings of loaded path (optim purpose)
};

export type MediaStateType = {
  datas: Map<string, string>;
  lookups: Map<string, string>;
};

export const initialState: MediaStateType = {
  datas: new Map(),
  lookups: new Map()
};

export function mediasReducer(state = initialState, action: MediasActionsUnion) {
  switch (action.type) {
    case MediasActionTypes.SetMedias: {
      state.datas.clear();
      state.lookups.clear();
      // State need to be a new OBJECT for subscribtor to get notified... :
      // Done through property expander : {... SrcObj}
      state = {
        ...action.medias.reduce((acc: MediaStateType, m: Media) => {
          acc.datas.set(m.index, m.dataUrl);
          acc.lookups.set(m.pathLookup, m.index);
          return acc;
        }, state)
      };
    }
    case MediasActionTypes.AddMedias: {
      // State need to be a new OBJECT for subscribtor to get notified... :
      // Done through property expander : {... SrcObj}
      state = {
        ...action.medias.reduce((acc: MediaStateType, m: Media) => {
          acc.datas.set(m.index, m.dataUrl);
          acc.lookups.set(m.pathLookup, m.index);
          return acc;
        }, state)
      };
    }
    default: {
    }
  }
  return state;
}

// TODO : find polyfill lib for webworkers caches :
// https://developers.google.com/web/fundamentals/instant-and-offline/web-storage/cache-api
// const cacheAvailable = 'caches' in window;
const Caches = window.caches;

@Injectable({
  providedIn: 'root'
})
export class MediasBufferService {
  mediaState: Observable<MediaStateType>;
  pendingMedias: Media[] = [];
  // pendingDataUrls: MediaStateType = initialState;
  // pendingFetches: Set<Promise<string>> = new Set();
  pendingFetches: [string, any, any][] = [];
  mediaCache: any = null;
  config: ConfigType = null;

  bulk: Media[] = [];

  // TODO : Transforming with
  // timingState.toPromise() may not fetch item...
  // Maybe since the call is made after the subscribe of another
  // component ??? => no pending data, so promise keep infinity ?? Strange...
  // Maybe I did miss somthing in the actual code...
  // No time to check what for now, backing up to local save :
  hackyCurrentStore: MediaStateType = initialState;

  // TODO : allow save option for local storage, to let user found back previously proceed medias...
  constructor(
    private store: Store<{ medias: MediaStateType }>,
    private storage: LocalStorage,
    public i18nService: I18nService
  ) {
    this.mediaState = this.store.pipe(select('medias'));
    this.mediaState.subscribe(newStore => {
      this.hackyCurrentStore = newStore;
    });
    this.refreshSettings();
  }

  // Insert timings with default bulk submit when size goese over bulkAfter value
  async addBulk(datas: Media[], bulkAfter = 200) {
    this.bulk = this.bulk.concat(datas);
    if (this.bulk.length > bulkAfter) {
      this.store.dispatch(new AddMedias(this.bulk));
      this.bulk = [];
    }
    // return await this.mediaState;
  }

  // Will submit pending bulk if some data is pending
  async finalizeBulks() {
    if (this.bulk.length > 0) {
      this.store.dispatch(new AddMedias(this.bulk));
      this.bulk = [];
    }
  }

  // Services are not reloaded on page change, opposit to components, so need
  // to manually call refreshSetting or have better listener system over config changes...
  refreshSettings() {
    configDefaults(this).then(cDef => {
      this.config = cDef;
      const selector = 'services';
      this.storage.getItem<any>('config', {}).subscribe(
        (globalConfig: any) => {
          // Called if data is valid or null
          if (!globalConfig) globalConfig = {};
          if (typeof globalConfig[selector] === 'undefined') {
            // globalConfig[selector] = this.config;
          } else {
            this.config = { ...this.config, ...globalConfig[selector] };
          }
          console.log(selector + ' Fetching config : ', this.config);
          // this.storage.setItem('config', globalConfig).subscribe(() => {});
          /*
          if (this.config.saveMediasToLocalStorage) {
            Caches.open('medias-buffer').then(cache => {
              this.mediaCache = cache;
              this.pendingDataUrls.forEach((v, k) => {
                this.mediaCache.keys().then((cacheKeys: []) => {
                  let index = '/cache/moon-manager/dataUrl/' + cacheKeys.length.toString();
                  this.mediaCache.put(index, new Response(v));
                });
              });
              this.pendingDataUrls.clear(); // TODO : what if error in storage set ? will lose data for now...
              // TODO : should await all above cache put before checking pendings fetches ?

              // TODO : async mutext etc ??? simple while for now, hopping for no clash...
              while (this.pendingFetches.length) {
                const pending = this.pendingFetches.pop();
                const [index, resolve, reject] = pending;
                this.mediaCache
                  .match(index)
                  .then((r: Response) => {
                    if (r) {
                      console.log('Pending resolved for :', index);
                      resolve(r.text);
                    } else {
                      console.warn('Pending fail lookup for :', index);
                      resolve(null);
                      // reject('Pending fail lookup for : ' + index);
                    }
                  })
                  .catch((e: any) => {
                    console.error('Pending error for :', index, e);
                    Promise.reject(e);
                  });
              }
            });
            // this.storage.getItem<any>('medias-buffer', {}).subscribe((msArr: any) => {
            //   const ms: Map<string, string> = msArr ? new Map(msArr) : new Map();
            //   this.pendingDataUrls.forEach((v, k) => {
            //     let index = 'moon-manager://dataUrl/' + ms.size.toString();
            //     ms.set(index, v);
            //   });
            //   this.pendingDataUrls.clear; // TODO : what if error in storage set ? will lose data for now...
            //   this.dataUrls = ms;
            //   this.storage.setItem('medias-buffer', [...ms]);
            //   // new Map([...this.dataUrls, ...ms]);
            // });
          } else {
          */
          if (this.pendingMedias.length) {
            this.store.dispatch(new AddMedias(this.pendingMedias));
            this.pendingMedias = [];
          }
        },
        error => {
          console.error('Fail to fetch config');
        }
      );
    });
  }

  async clear() {
    // if (this.config.saveMediasToLocalStorage) {
    //   if (this.mediaCache) {
    //     Caches.delete('medias-buffer').then(succed => {
    //       console.log('Did clear media cache : ', succed);
    //     });
    //   } else {
    //     console.error('Media cache not yet initialized'); // TODO : return promise to clear on init ? well Quota issue to solve before putting work in not available stuffs...
    //   }
    // } else {
    this.store.dispatch(new SetMedias([]));
  }

  async pushDataUrlMedia(path: string, dataUrl: string) {
    // => + what if index need to be computed AFTERWARDS ?
    // Ok for now since no Cache to handle, but index might be wrong if
    // cached data exist.....
    // index = '/cache/moon-manager/dataUrl/' + this.pendingMedias.length.toString();
    // => Solved by using MD5 :
    let media: Media = {
      index: '/cache/moon-manager/dataUrl/' + Md5.hashStr(path),
      pathLookup: path,
      dataUrl: dataUrl
    };
    if (!this.config) {
      // TODO : may be better to send itself in 0.5 sec seeing if config did setup ?
      this.pendingMedias.push(media);
    } else {
      // if (this.config.saveMediasToLocalStorage) {
      //   const cacheKeys = await this.mediaCache.keys();
      //   index = '/cache/moon-manager/dataUrl/' + cacheKeys.length.toString();
      //   // TODO : buffer system ? may be too much to save on EACH imported pict, may bulk it ?
      //   // will see with 2000 pict how it goes...
      //   // this.storage.setItem('medias-buffer', JSON.stringify(this.dataUrls.entries()));
      //   // this.storage.setItem('medias-buffer', [...this.dataUrls]);
      //   const requestMock = new Request(index, {
      //     headers: new Headers({
      //       'Content-Type': 'image/*'
      //     })
      //   });

      //   this.mediaCache.put(requestMock, new Response(dataUrl)).catch((e: any) => {
      //     console.error(e.message, e); // TODO : config issue ? always give QuotaExced ERROR
      //   });
      // } else {
      this.addBulk([media]);
    }
    return media.index;
  }

  async hasLookup(lookupPath: string) {
    // const ms = await this.mediaState.toPromise();
    const ms = this.hackyCurrentStore;
    return ms.lookups.has(lookupPath);
  }

  async getDataUrlMedia(index: string) {
    // if (this.config.saveMediasToLocalStorage) {
    //   if (!this.mediaCache) {
    //     const pending = new Promise<string>((resolve, reject) => {
    //       const pendingSize = this.pendingFetches.length;
    //       // TODO : should await this.mediaCache change from null...
    //       // https://stackoverflow.com/questions/49552258/how-to-listen-for-value-changes-from-class-property-typescript-angular-5
    //       console.log('Media Cache not initialized for ', index, '. Pending task...');
    //       this.pendingFetches.push([index, resolve, reject]);
    //     });
    //     return await pending;
    //   }
    //   await this.mediaCache.match(index);
    // } else {

    // return (await this.mediaState.toPromise()).datas.get(index);
    return this.hackyCurrentStore.datas.get(index);
  }

  async hasChanges() {
    // return (await this.mediaState.toPromise()).datas.size > 0;
    return this.hackyCurrentStore.lookups.size > 0;
  }

  async toArray() {
    // return this.dataUrls.entries(); // return MapIterable, not array...
    // const ms: MediaStateType = await this.mediaState.toPromise();
    const ms = this.hackyCurrentStore;
    return [...ms.lookups].map(t => {
      return t.concat([ms.datas.get(t[1])]);
    });
  }

  // Will return a Copy of states, modification to this array may not change source...
  async get() {
    // return await this.mediaState.toPromise();
    return this.hackyCurrentStore;
  }
}

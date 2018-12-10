// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Component, OnInit, Input, Output, ViewChild, EventEmitter, ElementRef } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { extract } from '@app/core';

import { BehaviorSubject } from 'rxjs';
import { TreeNode } from 'primeng/api';
import * as moment from 'moment';
import { set as setProperty } from 'lodash-es';
import { get as getProperty } from 'lodash-es';
import { has as hasProperty } from 'lodash-es';
import { LocalStorage } from '@ngx-pwa/local-storage';

import { Timing } from '../../api/data-model/timing';
import { MediasBufferService } from '../../services/medias-buffer.service';
import { I18n } from '@ngx-translate/i18n-polyfill';
import { configDefaults } from './config-form.model';
import { I18nService } from '@app/core';
import { LoadingLoaderService } from '../../services/loading-loader.service';

declare var CCapture: any;

@Component({
  selector: 'moon-manager-timing-pivot',
  templateUrl: './timing-pivot.component.html',
  styleUrls: ['./timing-pivot.component.scss']
})
export class TimingPivotComponent implements OnInit {
  @Input() config?: any = null;
  @Input() dataSrc: BehaviorSubject<Timing[]>;

  @Output() isFocused: EventEmitter<boolean> = new EventEmitter<boolean>();

  @ViewChild('videoCanvas') videoCanvas: ElementRef<HTMLCanvasElement>;
  public videoCtx: CanvasRenderingContext2D = null;
  public videoLoadPercent: number = 0;

  public filteredDatas: Timing[] = [];
  public filteredDatasAsync: BehaviorSubject<Timing[]> = new BehaviorSubject<Timing[]>([]);
  public timingsTrees: TreeNode[] = [];

  public allObjectifs: Set<string> = new Set();

  // TODO: normalizedUsedSegmentsMaxTjm => do not avoid change of TJM if more
  // valuable TJM is reached on same segment already used...
  public normalizedUsedSegments = {};
  public linearUsedSegments = {};
  public timingsByDay = {};
  public workloadsByAuthorAndDay = {};
  public indicatorAssets = {
    green: { url: 'assets/logos/MoonManager-64.png' },
    blue: { url: 'assets/logos/MoonManager-32.png' },
    yellow: { url: 'assets/logos/MoonManager-32-secondary.png' },
    red: { url: 'assets/logos/MoonManager-64-secondary.png' }
  };
  public timingsByDayAsync: BehaviorSubject<{}> = new BehaviorSubject<{}>({});
  private agregationsLookup = {};

  // Minimum diviseur commun de tous les SegmentsDeltas ?
  // TODO : should be computed from dataset (Min diviseur commun), and configurable by end user form... :
  // Our dataset only handle 1hr for git log and 0.2hr for capture. 0.2 divid all of those => ok for now...
  public normalizedSegmentFactor = 0.2; // TODO : from param or auto-algo ? fixed for now
  public workloadTotal = 0;
  public workloadByBillableDayTotal = 0;
  public billingTotal = 0;
  public daysMargin = 0;
  public daysForseen = 0;

  resetDataset() {
    this.filteredDatas = [];
    this.timingsTrees = [];
    this.allObjectifs.clear();
    this.normalizedUsedSegments = {};
    this.linearUsedSegments = {};
    this.timingsByDay = {};
    this.agregationsLookup = {};
    this.workloadTotal = 0;
    this.workloadByBillableDayTotal = 0;
    this.billingTotal = 0;
    this.daysMargin = 0;
    this.daysForseen = 0;
  }
  //  setTimeout is overwritten by
  // https://github.com/spite/ccapture.js/blob/master/src/CCapture.js
  // so need to keep original version for our custom delays, or use IMPORT from ??
  private _originalTimeout: any = null;

  public skillsRef = {
    RemoteEasyDev: {
      title: extract('Remote easy dev'),
      idx: extract('RED'),
      description: extract('mm.pivot.RED.details'),
      maxBusyHrByDay: 5,
      // justificatifs: extract(`5hr max via capture d'écran valant ${0.2}hr et
      // git log valant ${1}hr`) // TODO : times from form fields
      justificatifs: extract(`5hr max via capture d'écran valant 0.2hr et
      git log valant 1hr`) // TODO : times from form fields
    },
    RemoteProjectManagement: {
      title: extract('Remote project management'),
      idx: extract('RPM'),
      description: extract('Service de gestion de projet'),
      maxBusyHrByDay: 5,
      justificatifs: extract(`5hr max via capture d'écran valant 0.2hr et
      git log valant 1hr`) // TODO : times from form fields
    },
    RemoteReverseEngineering: {
      title: extract('Remote reverse engineering'),
      idx: extract('RRE'),
      description: extract(`Service d'analyse logiciel`),
      maxBusyHrByDay: 5,
      justificatifs: extract(`5hr max via capture d'écran valant 0.2hr et
      git log valant 1hr`) // TODO : times from form fields
    },
    RemoteFeaturesForcast: {
      title: extract('Remote features forcast'),
      idx: extract('RFF'),
      description: extract(`Service de veille technique et prévisionnelle`),
      maxBusyHrByDay: 5,
      justificatifs: extract(`5hr max via capture d'écran valant 0.2hr et
      git log valant 1hr`) // TODO : times from form fields
    },
    RemoteFullTutorialAndKnowledgeTransfert: {
      title: extract('Remote full tutorial and knowledge transfert'),
      idx: extract('RFTKT'),
      description: extract('mm.pivot.RFTKT.details'),
      maxBusyHrByDay: 5,
      justificatifs: extract(`5hr max via capture d'écran valant 0.2hr et
      git log valant 1hr`) // TODO : times from form fields
    }
  };

  // TODO : let user change it from form field and show all refresh....
  public TJMBySkillsId = {
    RemoteEasyDev: 400,
    RemoteProjectManagement: 500,
    RemoteReverseEngineering: 600,
    RemoteFeaturesForcast: 700,
    RemoteFullTutorialAndKnowledgeTransfert: 800
  };
  public HrSegmentBySource = {
    capture: 0.2,
    'git-log': 1
  };
  // public authorFilterList = ['John Doe'];
  public authorFilterList: string[] = [];

  public classByMonth = {
    '01': 'mat-gray-400',
    '02': 'mat-gray-500',
    '03': 'mat-gray-600',
    '04': 'mat-gray-700',
    '05': 'mat-gray-800',
    '06': 'mat-gray-900',
    '07': 'mat-gray-400',
    '08': 'mat-gray-500',
    '09': 'mat-gray-600',
    '10': 'mat-gray-700',
    '11': 'mat-gray-800',
    '12': 'mat-gray-900'
  };

  // TODO : find fully integrated with Max common tools language system
  // Quick hack for now :
  public trans = {
    toggleDataLoadBtn: extract('Arrêter le chargement')
  };

  @ViewChild('pivot_grid') pivot: ElementRef;

  constructor(
    private ll: LoadingLoaderService,
    private currencyPipe: CurrencyPipe,
    private medias: MediasBufferService,
    private storage: LocalStorage,
    private selfRef: ElementRef,
    private http: HttpClient,
    public i18nService: I18nService,
    public i18n: I18n // TODO : singleton or other default injection ? hard to put it in every components...
  ) {
    this._originalTimeout = window.setTimeout;

    let selector = this.selfRef.nativeElement.tagName.toLowerCase();

    configDefaults(this).then(cDef => {
      this.config = cDef;
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
        },
        error => {
          console.error('Fail to fetch config');
        }
      );
    });
  }
  ngOnInit() {
    this.loadIndicatorAssets();
  }

  // async delay(ms: number, resultCallback) {
  //   await new Promise(resolve =>
  //     setTimeout(()=>resolve(resultCallback()), ms)
  //   ).then(()=>console.log("Delay ok"));
  // }
  async computeDelay(ms: number, resultCallback: any) {
    await new Promise(resolve =>
      // setTimeout(()=>resolve(resultCallback()), ms)
      this._originalTimeout(() => {
        resultCallback();
        resolve();
      }, ms)
    ); //.then(()=>console.log("Delay ok"));
  }

  normalizeSegment(t: Timing) {
    // TODO : need to normalize segments => reduce all segments
    // targeted by (t.Date - t.SegmentDeltaHr).
    // TODO : ensure factor is dividable as integer, chose common denominator as factor...
    let countOfSegmentsOverride = t.SegmentDeltaHr / this.normalizedSegmentFactor;
    let LinearWorkloadAmount = 0;
    let workloadAmount = 0;
    let date = moment(t.DateTime);

    for (let i = 0; i < countOfSegmentsOverride; i++) {
      let segmentIndex = Math.floor((date.hours() + date.minutes() / 60) / this.normalizedSegmentFactor) - i;
      let segmentDate = moment(date);
      if (segmentIndex < 0) {
        // TODO : more generic algo, this one will fail if segment overlap in more than one day
        // (ok for our case, max is 1hr...)
        // break; // ignore previous day workload TODO : get this time back in formula ?
        segmentDate = segmentDate.subtract(1, 'days');
        segmentIndex += 24 / this.normalizedSegmentFactor;
      }
      const formatedDate = segmentDate.format('YYYY-MM-DD');
      // t.OverrideReduction
      // TODO : more generic Algo, just call normSetterCallback from function param ?
      let segmentUsePath = [t.Author, formatedDate, segmentIndex];
      let segmentMaxTJM = getProperty(this.normalizedUsedSegments, segmentUsePath);
      if (segmentMaxTJM) {
        if (t.TJM > segmentMaxTJM) {
          // segment is already used by another lower TJM => need to balance back TJM deltas :
          workloadAmount += (((t.TJM - segmentMaxTJM) * t.TJMWorkloadByDay) / t.TJM) * this.normalizedSegmentFactor;
          segmentMaxTJM = t.TJM;
        }
      } else {
        workloadAmount += this.normalizedSegmentFactor;
        segmentMaxTJM = t.TJM;
      }
      setProperty(this.normalizedUsedSegments, segmentUsePath, segmentMaxTJM);

      let linearSegmentUsePath = this.config.agregationsFields
        .slice(0, -1)
        .map((f: string) => t[f])
        .concat([formatedDate, segmentIndex]);
      let linearUsed: boolean = getProperty(this.linearUsedSegments, linearSegmentUsePath);
      if (!linearUsed) {
        LinearWorkloadAmount += this.normalizedSegmentFactor;
        linearUsed = true;
      }
      setProperty(this.linearUsedSegments, linearSegmentUsePath, linearUsed);
    }
    t.LinearWorkloadAmount = LinearWorkloadAmount;
    t.WorkloadAmount = workloadAmount;
  }

  loadIndicatorAssets() {
    Object.keys(this.indicatorAssets).forEach(k => {
      let asset = this.indicatorAssets[k];
      var reader = new FileReader();
      reader.onload = (event: any) => {
        var dataUri = event.target.result;
        var img = new Image();
        img.onload = () => {
          asset.img = img;
          console.log('Asset loaded : ', asset.url);
        };
        img.src = dataUri;
      };
      reader.onerror = (event: any) => {
        console.error('File could not be read! Code ' + event.target.error.code);
      };
      this.http.get(asset.url, { responseType: 'blob' }).subscribe((blob: Blob) => {
        if (blob) {
          reader.readAsDataURL(blob); // new File(blob, `frame-${frameIndex}.png`)
        } else {
          console.error('Fail to import asset : ', asset.url);
        }
      });
    });
  }

  ajustCanvasResolution() {
    let canvas: HTMLCanvasElement = <HTMLCanvasElement>this.videoCanvas.nativeElement;
    // canvas.width = canvas.clientWidth; // Resize computed canvas size to browser client size
    // canvas.height = canvas.clientHeight;
    if (this.config && this.config.lowRes) {
      canvas.width = 400;
      canvas.height = 320;
    } else {
      canvas.width = 700;
      canvas.height = 400;
    }
  }

  ngAfterViewInit() {
    this.videoCtx = (<HTMLCanvasElement>this.videoCanvas.nativeElement).getContext('2d'); // TODO : BONUS add Unity to render in gameCtx => '3D'
    this.ajustCanvasResolution();

    this.dataSrc.subscribe((timings: Timing[]) => {
      timings.sort((t1, t2) => {
        const d1 = moment(t1.DateTime);
        const d2 = moment(t2.DateTime);
        // TODO : inject and sort global timings table => auto load past data when going done...
        return -(d1.valueOf() - d2.valueOf());
      });
      // timings.sort((t1, t2) => { // TODO : inject and sort global timings table => auto load past data when going done...
      //   return this.config.agregationsFields.reduce((acc, field) => {
      //     return acc || (typeof t1[field] === 'string' || t1[field] instanceof String
      //       ? t1[field].localeCompare(t2[field])
      //       : t1[field] - t2[field]
      //     );
      //   }, 0);
      // });
      // this.zone.run(() => {
      (() => {
        // console.log(timings);
        // TODO : better incrementive algo for optim ? or over optim that will cost somwher else ?
        this.resetDataset();
        this.filteredDatas = this.filteredDatas.concat(
          timings.reduce((acc, t) => {
            // TODO : DATA Transformers designs ...
            if (t.Author in this.config.authorReferencial) {
              // TODO : what if config is null ? better Async design needed...
              t.Author = this.config.authorReferencial[t.Author];
            }
            if (this.authorFilterList.length && !this.authorFilterList.includes(t.Author)) {
              return acc; // avoid filtered datas
            }

            // TODO : default init from user profile params ?
            t.isHidden = false;
            t.WorkloadAmount = 0;
            // only counts first events in import that overwrite a
            // time periode segment.
            // Could also be done by Tablor formula :
            // CountsAllUniques(AgregatedRange)
            // let skillsId = t.SkillsId in this.TJMBySkillsId ?
            //   t.SkillsId : 'RemoteEasyDev'; // TODO : default as param ?
            let skillsId = hasProperty(this.TJMBySkillsId, t.ExpertiseLevel) ? t.ExpertiseLevel : 'RemoteEasyDev';
            t.SkillsId = skillsId;
            t.TJM = this.TJMBySkillsId[skillsId];
            // Nombre d'heure travaillé Max pr 1 jours facturé
            t.TJMWorkloadByDay = this.skillsRef[skillsId].maxBusyHrByDay;
            t.LinearWorkloadAmount = t.SegmentDeltaHr;

            this.normalizeSegment(t);
            // TODO : let user input it from config form for all report ?
            // BONUS associate TJM to Author and UsedSkills keys...
            // -> for bonus : auto-gen Referentiel in Form detail (keep
            // mantatory feature of auto fix global TJM, just add detail setup
            // if user need it...)

            t.Price = (t.TJM * t.WorkloadAmount) / t.TJMWorkloadByDay;
            // let use MySQL date format :
            // https://stackoverflow.com/questions/15411833/using-moment-js-to-convert-date-to-string-mm-dd-yyyy
            let dateIdx = moment(t.Date).format('YYYY-MM-DD');
            if (!hasProperty(this.timingsByDay, dateIdx)) {
              this.timingsByDay[dateIdx] = [];
            }
            this.timingsByDay[dateIdx].push(t);
            this.workloadTotal += t.WorkloadAmount;
            this.workloadByBillableDayTotal += t.WorkloadAmount / t.TJMWorkloadByDay;
            this.billingTotal += t.Price;
            this.daysMargin = this.config.paidDays + this.config.receivedDays - this.workloadByBillableDayTotal;
            this.daysForseen = this.config.billedDays + this.config.compensatedDays;

            this.insertInTimingsTrees(t);
            this.allObjectifs.add(t.Objectif);
            acc.push(t);

            return acc;
          }, [])
        );

        this.filteredDatasAsync.next(this.filteredDatas.slice().reverse());
        // console.log('Filtered data : ', this.filteredDatas);
        this.workloadsByAuthorAndDay = Object.entries(this.timingsByDay).reduce((acc: any, entry: any) => {
          // let dayKey: string = entry[0]; // TODO : refactor or ok ?? No same format as t.Date (-/)
          entry[1].reduce((acc: any, t: Timing) => {
            let day = t.Date;
            if (!(t.Author in acc)) {
              acc[t.Author] = {};
            }
            if (!(day in acc[t.Author])) {
              acc[t.Author][day] = 0; // initial value for worload daily summaries
            }
            acc[t.Author][day] += t.WorkloadAmount;
            return acc;
          }, acc);
          return acc;
        }, {});

        this.timingsByDayAsync.next(this.timingsByDay);

        // this.timingsTrees = <TreeNode[]> JSON.parse(JSON.stringify(this.timingsTrees));
        // https://stackoverflow.com/questions/11616630/json-stringify-avoid-typeerror-converting-circular-structure-to-json/11616993
        const cache = new Set();
        this.timingsTrees = <TreeNode[]>JSON.parse(
          JSON.stringify(this.timingsTrees, (key, value) => {
            if (typeof value === 'object' && value !== null) {
              if (cache.has(value)) {
                // Circular reference found, discard key
                return; // TODO : which field is circular ref ? strange...
              }
              // Store value in our set
              cache.add(value);
            }
            return value;
          })
        );

        // this.timingsTrees = <TreeNode[]> [
        //   {
        //     "data": {
        //       "Title": "MiguelMonwoo",
        //       "Time": "08:41:04",
        //       "SkillsId": "RemoteEasyDev",
        //       "WorkloadAmount": 0.2,
        //       "TJM": 400,
        //       "Price": 16
        //     },
        //     "children": [
        //       {
        //         "data": {
        //           "Title": "capture",
        //           "Time": "08:41:04",
        //           "SkillsId": "RemoteEasyDev",
        //           "WorkloadAmount": 0.2,
        //           "TJM": 400,
        //           "Price": 16
        //         },
        //       }
        //     ]
        //   },
        // ];

        // console.log('timingsTrees', this.timingsTrees);
        // console.log('AgregationsLookup', this.agregationsLookup);
      })(); // });
    });
  }

  insertInTimingsTrees(t: Timing) {
    let agregationPath = '';
    let fieldPath = '';
    this.config.agregationsFields.forEach((field: string, idx: number) => {
      // TODO : let reduce = sum done via agregaor functions linked to argeged fields
      let title = t[field];
      fieldPath += `${field}<${title}>`;
      let separator = agregationPath === '' ? '' : '.';
      // let subGroupLength = getProperty(this.timingsTrees, agregationPath + separator + 'children', []).length;
      let groupPath = agregationPath.replace(/\.[0-9]+$/, '');
      let groupLength =
        groupPath === '' ? this.timingsTrees.length : getProperty(this.timingsTrees, groupPath, []).length;
      // Building rows groups metadatas :
      let lookupPath = [fieldPath];
      if (!getProperty(this.agregationsLookup, lookupPath)) {
        setProperty(this.agregationsLookup, lookupPath, {
          index: groupLength,
          computingsByField: {}
        });
      }

      let updateAgregationsFields = (agField: string, reducer: any, initialValue: any = null) => {
        // let agPath = `${lookupPath}.computingsByField.${agField}`;
        let agPath = [...lookupPath, 'computingsByField', agField];
        let lastAgregation = getProperty(this.agregationsLookup, agPath, initialValue);
        setProperty(this.agregationsLookup, agPath, reducer(lastAgregation, t));
      };

      updateAgregationsFields(
        'Time',
        (lastAgregation: any, t: Timing) => {
          // lastAgregation[moment(t.Time, "HH:mm:ss").format('HH')] = true;
          lastAgregation[t.Time.split(':')[0]] = true;
          return lastAgregation;
        },
        {}
      );

      updateAgregationsFields(
        'SkillsId',
        (lastAgregation: any, t: Timing) => {
          // lastAgregation[moment(t.Time, "HH:mm:ss").format('HH')] = true;
          lastAgregation[this.skillsRef[t.SkillsId].idx] = true;
          return lastAgregation;
        },
        {}
      );

      updateAgregationsFields(
        'LinearWorkloadAmount',
        (lastAgregation: any, t: Timing) => {
          // TODO : model to finely handle normalized Segments over agregation fields
          // instead of algo copies...
          lastAgregation.total += t.LinearWorkloadAmount;
          return lastAgregation;
        },
        {
          total: 0
          // normalizedUsedSegments:  {}, // TODO ?
        }
      );

      updateAgregationsFields(
        'WorkloadAmount',
        (lastAgregation: any, t: Timing) => {
          return lastAgregation + t.WorkloadAmount;
        },
        0
      );

      updateAgregationsFields(
        'TJM',
        (lastAgregation: any, t: Timing) => {
          lastAgregation[t.TJM] = true;
          return lastAgregation;
        },
        {}
      );

      updateAgregationsFields(
        'Price',
        (lastAgregation: any, t: Timing) => {
          return lastAgregation + t.Price;
        },
        0
      );

      updateAgregationsFields(
        'EventSource',
        (lastAgregation: any, t: Timing) => {
          // lastAgregation[moment(t.Time, "HH:mm:ss").format('HH')] = true;
          lastAgregation[t.EventSource] = true;
          return lastAgregation;
        },
        {}
      );

      // TODO : use reducer callback from config properties ?

      let lookup = getProperty(this.agregationsLookup, lookupPath);
      let groupIndex = lookup.index;
      let path = agregationPath + separator + `${groupIndex}`;

      // Building tree
      let treeData = {
        // {...defaultData, ...{
        EventSource: t.EventSource,
        Title: title,
        TreeIdx: idx,
        Time: t.Time,
        SkillsId: t.SkillsId,
        LinearWorkloadAmount: t.LinearWorkloadAmount,
        WorkloadAmount: t.WorkloadAmount,
        TJM: this.currencyPipe.transform(t.TJM, 'EUR'),
        Price: t.Price
      };
      if (idx !== this.config.agregationsFields.length - 1) {
        // Compute sum & agregation of sub-totals rows :
        // TODO : replace with better design patter : loop over lookup.computingsByField and
        // use same systeme as SF CVVideo patern ways as for forms keys bindings... : (OutputTransformers)
        treeData.EventSource = Object.keys(lookup.computingsByField['EventSource'])
          .sort()
          .join('<br/>');
        treeData.Time = Object.keys(lookup.computingsByField['Time'])
          .sort()
          .join(', ');
        treeData.SkillsId = Object.keys(lookup.computingsByField['SkillsId'])
          .sort()
          .join(', ');
        treeData.WorkloadAmount = lookup.computingsByField['WorkloadAmount'];
        treeData.LinearWorkloadAmount = lookup.computingsByField['LinearWorkloadAmount'].total;
        treeData.TJM = Object.keys(lookup.computingsByField['TJM'])
          .sort()
          .map(e => this.currencyPipe.transform(e, 'EUR'))
          .join(', ');
        treeData.Price = lookup.computingsByField['Price'];

        if (idx < this.config.agregationsFields.length - 3) {
          setProperty(this.timingsTrees, path + '.expanded', true);
        }
      } else {
        // injecting leaf datas :
        let subGroupLength = getProperty(this.timingsTrees, agregationPath, []).length;
        path = agregationPath + separator + `${subGroupLength}`;
      }

      // if (!getProperty(this.timingsTrees, path)) {
      //   // setProperty(this.agregationsLookup, [field, title], groupLength);
      //   setProperty(this.timingsTrees, path, treeData);
      // }
      setProperty(this.timingsTrees, path + '.data', treeData);
      agregationPath += separator + `${groupIndex}.children`;
    });
  }

  exportsTimingsToVideoAsWebM() {
    this.ll.showLoader();
    // CF source code of :
    // http://techslides.com/demos/image-video/create.html
    let self: TimingPivotComponent = this;
    let computeDelayMs = 1; // 42; // 1/24*1000 = 41.66
    // => will add 1 frame at chosen FPS speed to capture...
    let stackDelayFrame = 0; // will wait for compute : stackDelayFrame * computeDelayMs
    let bulkDownloadSize = 2500; // TODO : split video if too long ??? bulk download is halfSolution...
    let frames = this.filteredDatas // TODO : solve too much api call issue and remove slice limit
      //.filter(t=>('capture' === t.EventSource && typeof(t.MediaUrl)!=='undefined'))
      // .slice(0, 125).reverse() //.map((t:Timing) => (t.MediaUrl));
      .slice()
      .reverse(); //.map((t:Timing) => (t.MediaUrl));
    let fps = 25;
    // let video = new Whammy.Video(fps); => having issue with too fast img fetching...
    // will try other framework waitting to see if Whammy gets improved....
    var capturer = new CCapture({
      framerate: 24, // stackDelayFrame will wait 1/24 sec for vid output
      verbose: false,
      format: 'webm',
      // display: true,
      quality: 99
    });

    let canvas: HTMLCanvasElement = <HTMLCanvasElement>this.videoCanvas.nativeElement;
    let context: CanvasRenderingContext2D = this.videoCtx; // TODO from elts ref.

    let clearScreen = () => {
      // TODO
      context.save(); // state pushed onto stack.
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore(); // state popped from stack, and set on 2D Context.
    };

    let finalizeFrame = (framePos: number, nbFrames: number) => {
      //check if its ready
      // self.videoLoadPercent = Math.floor((100 * framePos) / nbFrames);
      self.videoLoadPercent = (100 * framePos) / nbFrames;
      console.log('Pivot Finalise Frames :', framePos, nbFrames);
      if (framePos == nbFrames) {
        capturer.stop();
        capturer.save();
        this.ll.hideLoader();
      }
    };

    let process = (frame: Timing, frameIndex: number) => {
      let file = frame.MediaUrl;
      if ('capture' !== frame.EventSource || typeof frame.MediaUrl !== 'string') {
        // It's unknonw Frame : TODO : show to end user...
        clearScreen();
        context.font = self.config.lowRes ? '10px Comic Sans MS' : '10px Comic Sans MS';
        context.fillStyle = self.config.videoFontColor;
        context.textAlign = 'center';
        context.fillText(self.config.videoCopyright, canvas.width / 2, 12);
        context.font = self.config.lowRes ? '9px Arial' : '18px Arial';
        context.textAlign = 'left';
        context.fillText(frame.Comment, 0, 90);
        context.font = self.config.lowRes ? '7px Arial' : '14px Arial';
        context.fillText(
          `${frame.Date} ${frame.Time} - ` + `${frame.SubProject} [${frame.Objectif}]`,
          2,
          canvas.height - 7
        );

        let dailyWorkload = self.workloadsByAuthorAndDay[frame.Author][frame.Date];
        // Vert : j <= 1hr, Bleu : 1hr < j <= 5hr, Jaune : 5hr < j < 7hr, Rouge : j >= 7hr
        let indicatorSummary =
          dailyWorkload >= 7 ? 'red' : dailyWorkload > 5 ? 'yellow' : dailyWorkload > 1 ? 'blue' : 'green';
        let indicatorImg = self.indicatorAssets[indicatorSummary].img;
        context.drawImage(
          indicatorImg,
          canvas.width - 64,
          64 - indicatorImg.height,
          indicatorImg.width,
          indicatorImg.height
        );

        capturer.capture(canvas);
        stackDelayFrame = 7; // 69; // will wait 42 frame, since recording at 24FPS ~ 2 sec ?

        finalizeFrame(frameIndex + 1, frames.length);
        return; // Done for non-pictures medias
      }

      var img = new Image();

      //load image and drop into canvas
      img.onload = () => {
        let drawInfos = () => {
          let deltaHeight = self.config.lowRes ? 18 : 35;
          let fillHeight = self.config.lowRes ? 10 : 20;
          context.globalAlpha = 1;
          context.font = self.config.lowRes ? '10px Comic Sans MS' : '20px Comic Sans MS';
          context.fillStyle = self.config.videoFontColor; // Primary color
          context.textAlign = 'center';
          context.fillText(self.config.videoCopyright, canvas.width / 2, fillHeight);

          context.globalAlpha = 0.75;
          context.fillStyle = 'white';
          context.fillRect(0, canvas.height - deltaHeight, canvas.width, fillHeight);
          context.globalAlpha = 1;

          context.fillStyle = self.config.videoFontColor; // Primary color
          context.textAlign = 'left';
          context.font = self.config.lowRes ? '8px Arial' : '16px Arial';
          // context.strokeStyle = 'white'; // secondary color
          // context.strokeText(
          //   `${frame.Date} ${frame.Time} - `
          //   + `${frame.SubProject} [${frame.Objectif}]`
          //   , 2, canvas.height - 7);
          context.fillText(
            // White shadow to allow changing Bg
            `${frame.Date} ${frame.Time} - ` + `${frame.SubProject} [${frame.Objectif}]`,
            2,
            canvas.height - fillHeight
          );
          // context.stroke();
          // context.fill();

          let dailyWorkload = self.workloadsByAuthorAndDay[frame.Author][frame.Date];
          // Vert : j <= 1hr, Bleu : 1hr < j <= 5hr, Jaune : 5hr < j < 7hr, Rouge : j >= 7hr
          let indicatorSummary =
            dailyWorkload >= 7 ? 'red' : dailyWorkload > 5 ? 'yellow' : dailyWorkload > 1 ? 'blue' : 'green';
          let indicatorImg = self.indicatorAssets[indicatorSummary].img;
          context.drawImage(
            indicatorImg,
            canvas.width - 64,
            64 - indicatorImg.height,
            indicatorImg.width,
            indicatorImg.height
          );

          capturer.capture(canvas);
          //capturer.capture(canvas);
          //capturer.capture(canvas);

          // 25 fps = 1 sec of video...
          // => timing issue ? need delay ? give wrong video output...
          // => may have to do with timeOut overload ? one capture per changes only ?
          // [...Array(25)].forEach((_, i) => {
          //   // console.log(i);
          //   context.fillText(
          //     `${frame.Date} ${frame.Time} - `
          //     + `${frame.SubProject} [${frame.Objectif}]`
          //     , 2, canvas.height - 7);
          //   capturer.capture(canvas);
          // });
        };

        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        clearScreen(); // Will tick white bg...
        // https://stackoverflow.com/questions/23104582/scaling-an-image-to-fit-on-canvas
        var hRatio = canvas.width / img.width;
        var vRatio = canvas.height / img.height;
        var ratio = Math.min(hRatio, vRatio);
        if (ratio > 1) {
          ratio = 1; // removing scaling Up effect, keep lower pict size at original size
        }
        var centerShift_x = (canvas.width - img.width * ratio) / 2;
        var centerShift_y = (canvas.height - img.height * ratio) / 2;

        // //a custom fade in and out slideshow
        // context.globalAlpha = 0.6;
        // context.drawImage(
        //   img,
        //   0,
        //   0,
        //   img.width,
        //   img.height,
        //   centerShift_x,
        //   centerShift_y,
        //   img.width * ratio,
        //   img.height * ratio
        // );
        // // video.add(context);
        // drawInfos();
        // // clearScreen();
        // context.globalAlpha = 0.65;
        // context.drawImage(
        //   img,
        //   0,
        //   0,
        //   img.width,
        //   img.height,
        //   centerShift_x,
        //   centerShift_y,
        //   img.width * ratio,
        //   img.height * ratio
        // );
        // drawInfos();
        // // clearScreen();
        // context.globalAlpha = 0.7;
        // context.drawImage(
        //   img,
        //   0,
        //   0,
        //   img.width,
        //   img.height,
        //   centerShift_x,
        //   centerShift_y,
        //   img.width * ratio,
        //   img.height * ratio
        // );
        // drawInfos();
        // // clearScreen();
        // context.globalAlpha = 0.8;
        // context.drawImage(
        //   img,
        //   0,
        //   0,
        //   img.width,
        //   img.height,
        //   centerShift_x,
        //   centerShift_y,
        //   img.width * ratio,
        //   img.height * ratio
        // );
        // drawInfos();
        // // clearScreen();
        context.globalAlpha = 1;
        context.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          centerShift_x,
          centerShift_y,
          img.width * ratio,
          img.height * ratio
        );

        //this should be a loop based on some user input
        drawInfos();

        // Pb : need timeout LOOP : will not take in account if no waits in
        // betweens ??? => having full transparent img for now
        // clearScreen();
        // context.globalAlpha = 0.8;
        // context.drawImage(img, 0, 0, canvas.width, canvas.height);
        // drawInfos();
        // clearScreen();
        // context.globalAlpha = 0.6;
        // context.drawImage(img, 0, 0, canvas.width, canvas.height);
        // drawInfos();
        // clearScreen();
        // context.globalAlpha = 0.4;
        // context.drawImage(img, 0, 0, canvas.width, canvas.height);
        // drawInfos();

        finalizeFrame(frameIndex + 1, frames.length);
        stackDelayFrame = 12;
      };
      self.medias.getDataUrlMedia(frame.MediaUrl).then(url => {
        img.src = url;
      });

      // TODO : from Api service ? :
      // var reader = new FileReader();
      // reader.onload = function(event:any) {
      //     var dataUri = event.target.result;
      //     var img = new Image();

      //     //load image and drop into canvas
      //     img.onload = function() {
      //         let drawInfos = () => {
      //           context.globalAlpha = 1;
      //           context.font = "10px Arial";
      //           context.font = "10px Comic Sans MS";
      //           context.fillStyle = "rgb(60,0,108)"; // Primary color
      //           context.textAlign = "center";
      //           context.fillText("© Monwoo", canvas.width/2, 12);

      //           context.fillStyle="white";
      //           context.fillRect(0,canvas.height - 15,canvas.width,10);

      //           context.fillStyle = "rgb(60,0,108)"; // Primary color
      //           context.textAlign = "left";
      //           context.font = "8px Arial";
      //           // context.strokeStyle = 'white'; // secondary color
      //           // context.strokeText(
      //           //   `${frame.Date} ${frame.Time} - `
      //           //   + `${frame.SubProject} [${frame.Objectif}]`
      //           //   , 2, canvas.height - 7);
      //           context.fillText( // White shadow to allow changing Bg
      //             `${frame.Date} ${frame.Time} - `
      //             + `${frame.SubProject} [${frame.Objectif}]`
      //             , 2, canvas.height - 7);
      //           // context.stroke();
      //           // context.fill();

      //           capturer.capture(canvas);
      //           //capturer.capture(canvas);
      //           //capturer.capture(canvas);

      //             // 25 fps = 1 sec of video...
      //             // => timing issue ? need delay ? give wrong video output...
      //             // [...Array(25)].forEach((_, i) => {
      //             //   // console.log(i);
      //             //   context.fillText(
      //             //     `${frame.Date} ${frame.Time} - `
      //             //     + `${frame.SubProject} [${frame.Objectif}]`
      //             //     , 2, canvas.height - 7);
      //             //   capturer.capture(canvas);
      //             // });
      //         }

      //         //a custom fade in and out slideshow
      //         context.globalAlpha = 0.2;
      //         context.drawImage(img, 0, 0, canvas.width, canvas.height);
      //         // video.add(context);
      //         drawInfos();
      //         context.clearRect(0,0,context.canvas.width,context.canvas.height);
      //         context.globalAlpha = 0.4;
      //         context.drawImage(img, 0, 0, canvas.width, canvas.height);
      //         drawInfos();
      //         context.clearRect(0,0,context.canvas.width,context.canvas.height);
      //         context.globalAlpha = 0.6;
      //         context.drawImage(img, 0, 0, canvas.width, canvas.height);
      //         drawInfos();
      //         context.clearRect(0,0,context.canvas.width,context.canvas.height);
      //         context.globalAlpha = 0.8;
      //         context.drawImage(img, 0, 0, canvas.width, canvas.height);
      //         drawInfos();
      //         context.clearRect(0,0,context.canvas.width,context.canvas.height);
      //         context.globalAlpha = 1;
      //         context.drawImage(img, 0, 0, canvas.width, canvas.height);

      //         //this should be a loop based on some user input
      //         drawInfos();

      //         context.clearRect(0,0,context.canvas.width,context.canvas.height);
      //         context.globalAlpha = 0.8;
      //         context.drawImage(img, 0, 0, canvas.width, canvas.height);
      //         drawInfos();
      //         context.clearRect(0,0,context.canvas.width,context.canvas.height);
      //         context.globalAlpha = 0.6;
      //         context.drawImage(img, 0, 0, canvas.width, canvas.height);
      //         drawInfos();
      //         context.clearRect(0,0,context.canvas.width,context.canvas.height);
      //         context.globalAlpha = 0.4;
      //         context.drawImage(img, 0, 0, canvas.width, canvas.height);
      //         drawInfos();

      //         finalizeFrame(frameIndex + 1, frames.length);
      //         stackDelayFrame = 24;
      //     };
      //     img.src = dataUri;
      // };

      // reader.onerror = function(event:any) {
      //     console.error("File could not be read! Code " + event.target.error.code);
      // };

      // let baseUrl = 'http://localhost:8000/api/fetch-media?url=';
      // self.http.get(baseUrl + encodeURIComponent(file), { responseType: 'blob' })
      // .subscribe((blob:Blob) => {
      //   if (blob) {
      //     reader.readAsDataURL(blob); // new File(blob, `frame-${frameIndex}.png`)
      //   } else {
      //     console.error('Fail to import frame : ', file);
      //   }
      // });
    };

    // frames.forEach((f, idx) => {
    //   process(f, idx);
    // });
    let loopFrames = (idx: number) => {
      let f = frames[idx];
      if (stackDelayFrame > 0) {
        // TODO : rebuild with promise system : some process is Async, waiting for download
        // keep wating for the asked delayed frames
        --stackDelayFrame;
        capturer.capture(canvas);
      } else {
        // process and get to next frame
        process(f, idx);
        ++idx;
      }
      if (idx < frames.length) {
        //console.log('Will delay next loop');
        // TODO : solve too much call issue ? delay for now...
        this.computeDelay(computeDelayMs, () => {
          loopFrames(idx);
        }); //.then(()=>{console.log('Delay OK')});
      }
    };

    clearScreen();
    capturer.start();
    loopFrames(0);
  }

  downloadTimingsVideo() {
    this.exportsTimingsToVideoAsWebM();
  }

  saveChanges(t: Timing, k: string, v: any) {
    console.log('Save Change', t, k, v);
    t[k] = v;
    // TODO : call rest API with updated Obj
  }

  editTiming(t: Timing) {
    // TODO : need form => move to timing-form...
  }

  hideTiming(t: Timing) {
    // TODO : data store ?
    t.isHidden = true;
  }
  showTiming(t: Timing) {
    // TODO : data store ?
    t.isHidden = false;
  }
  // toggleResolutions() {
  //   this.config.lowRes = !this.config.lowRes;
  //   save config
  // }
}

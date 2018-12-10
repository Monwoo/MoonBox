// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { Component, OnInit, Input } from '@angular/core';
import { CalendarEvent, CalendarMonthViewDay } from 'angular-calendar';
import * as moment from 'moment';
import { BehaviorSubject } from 'rxjs';
import { extract, I18nService } from '@app/core';
// https://mattlewis92.github.io/angular-calendar/#/i18n
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr'; // TODO : automatic from .environment file
registerLocaleData(localeFr);

import { Timing } from '../../api/data-model/timing';

// TODO : load from scss template file ?
const colors: any = {
  // TODO : load from src/theme/theme-variables.scss
  // or better theming design system :
  // https://www.bluematador.com/blog/how-to-share-variables-between-js-and-sass
  // https://til.hashrocket.com/posts/sxbrscjuqu-share-scss-variables-with-javascript
  // https://itnext.io/sharing-variables-between-js-and-sass-using-webpack-sass-loader-713f51fa7fa0
  green: {
    primary: '#146601',
    secondary: '#01663f'
  },
  blue: {
    primary: '#11589a',
    secondary: '#31119a'
  },
  yellow: {
    primary: '#c3c11c',
    secondary: '#c3971c'
  },
  red: {
    primary: '#d11232',
    secondary: '#d13212'
  }
};

@Component({
  selector: 'moon-manager-timeline-yearly-plan',
  templateUrl: './timeline-yearly-plan.component.html',
  styleUrls: ['./timeline-yearly-plan.component.scss']
})
export class TimelineYearlyPlanComponent implements OnInit {
  @Input() timingsByDayAsync: BehaviorSubject<{}>;

  public viewDate: Date = new Date();

  public sortedMonths: Map<string, string> = new Map();
  public sortedMonthsKeys: string[] = [];

  public eventsByMonths: Map<string, Array<CalendarEvent<{ incrementsBadgeTotal: boolean }>>> = new Map();

  private locale: string = null;
  constructor(private i18nService: I18nService) {}

  ngOnInit(): void {
    // calendar do not know fr-FR locale...
    const missingLocalsHack = {
      'fr-FR': 'fr',
      'en-US': 'en'
    };
    this.locale = missingLocalsHack[this.i18nService.language];
  }
  ngAfterViewInit() {
    this.timingsByDayAsync.subscribe(timingsByDay => {
      // console.log('Yearly plan timings : ', timingsByDay);
      this.onTimginsByDayDidChange(timingsByDay);
    });
  }

  private workloadByMonth: Map<string, number> = new Map();
  onTimginsByDayDidChange(newTimingsByDay: {}) {
    // this.events = Object.keys(newTimingsByDay).map(k => {
    //   let t = newTimingsByDay[k];
    //   return {
    //     title: 'Increments badge total on the day cell',
    //     color: colors.yellow,
    //     start: new Date(),
    //     meta: {
    //       incrementsBadgeTotal: true
    //     }
    //   };
    // });

    this.eventsByMonths.clear();
    this.workloadByMonth.clear();
    Object.keys(newTimingsByDay).forEach(k => {
      let timings = newTimingsByDay[k];
      // TODO : moment.locale('fr'); // TODO : tranlation and locales system...

      let date = moment(k, 'YYYY-MM-DD');
      date.locale(this.i18nService.language); // TODO : fail to import month name in own local for now...
      let month = date.format('MMMM YYYY'); // TODO : local translations...
      let dayWorkload = timings.reduce((acc: number, t: Timing) => {
        return acc + t.WorkloadAmount;
      }, 0);
      this.sortedMonths.set(date.format('YYYY-MM'), month);
      if (!this.eventsByMonths.has(month)) {
        this.eventsByMonths.set(month, []);
      }
      if (!this.workloadByMonth.has(month)) {
        this.workloadByMonth.set(month, 0);
      }
      this.workloadByMonth.set(month, this.workloadByMonth.get(month) + dayWorkload);
      this.eventsByMonths.get(month).push({
        title: k + ' : ' + dayWorkload.toFixed(2) + extract(' heures'),
        // TODO : color based on TJM day time limites, ok for now
        // since all days take same amount of hours max : 5
        color:
          dayWorkload > 7 ? colors.red : dayWorkload > 5 ? colors.yellow : dayWorkload > 1 ? colors.blue : colors.green,
        start: date.toDate(),
        meta: {
          incrementsBadgeTotal: false
        }
      });
    });
    // console.log('Having Maps : ', this.sortedMonths.entries(), this.eventsByMonths.entries());
    this.sortedMonthsKeys = Array.from(this.sortedMonths.keys())
      .sort()
      .reverse();
  }

  beforeMonthViewRender({ body }: { body: CalendarMonthViewDay[] }): void {
    body.forEach(day => {
      day.badgeTotal = day.events.filter(event => event.meta.incrementsBadgeTotal).length;
    });
  }
}

// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TimelineYearlyPlanComponent } from './timeline-yearly-plan.component';

describe('TimelineYearlyPlanComponent', () => {
  let component: TimelineYearlyPlanComponent;
  let fixture: ComponentFixture<TimelineYearlyPlanComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TimelineYearlyPlanComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimelineYearlyPlanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

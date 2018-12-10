// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TimingPivotComponent } from './timing-pivot.component';

describe('TimingPivotComponent', () => {
  let component: TimingPivotComponent;
  let fixture: ComponentFixture<TimingPivotComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TimingPivotComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimingPivotComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

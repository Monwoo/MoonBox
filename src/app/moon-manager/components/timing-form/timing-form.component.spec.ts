// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TimingFormComponent } from './timing-form.component';

describe('TimingFormComponent', () => {
  let component: TimingFormComponent;
  let fixture: ComponentFixture<TimingFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [TimingFormComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TimingFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AFrameTutorialComponent } from './aframe-tutorial.component';

describe('AFrameTutorialComponent', () => {
  let component: AFrameTutorialComponent;
  let fixture: ComponentFixture<AFrameTutorialComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [AFrameTutorialComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AFrameTutorialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

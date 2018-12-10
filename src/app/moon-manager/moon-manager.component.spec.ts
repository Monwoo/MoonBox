import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MoonManagerComponent } from './moon-manager.component';

describe('MoonManagerComponent', () => {
  let component: MoonManagerComponent;
  let fixture: ComponentFixture<MoonManagerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MoonManagerComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MoonManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

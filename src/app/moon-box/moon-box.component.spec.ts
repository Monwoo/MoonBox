import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MoonBoxComponent } from './moon-box.component';

describe('MoonBoxComponent', () => {
  let component: MoonBoxComponent;
  let fixture: ComponentFixture<MoonBoxComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MoonBoxComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MoonBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

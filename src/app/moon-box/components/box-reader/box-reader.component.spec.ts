import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BoxReaderComponent } from './box-reader.component';

describe('BoxReaderComponent', () => {
  let component: BoxReaderComponent;
  let fixture: ComponentFixture<BoxReaderComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [BoxReaderComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BoxReaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

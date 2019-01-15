import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GithubCounterComponent } from './github-counter.component';

describe('GithubCounterComponent', () => {
  let component: GithubCounterComponent;
  let fixture: ComponentFixture<GithubCounterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [GithubCounterComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GithubCounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

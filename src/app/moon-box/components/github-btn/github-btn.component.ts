import { Component, OnInit } from '@angular/core';
import { NtkmeButtonComponent } from '@ctrl/ngx-github-buttons';

@Component({
  selector: 'moon-box-github-btn',
  templateUrl: './github-btn.component.html',
  styleUrls: ['./github-btn.component.scss']
})
export class GithubBtnComponent extends NtkmeButtonComponent {}

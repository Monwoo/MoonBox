import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

export interface DialogData {
  passHash: string;
}

@Component({
  selector: 'app-lock-screen',
  templateUrl: './lock-screen.component.html',
  styleUrls: ['./lock-screen.component.scss']
})
export class LockScreenComponent implements OnInit {
  // https://material.angular.io/components/dialog/overview
  constructor(public dialogRef: MatDialogRef<LockScreenComponent>, @Inject(MAT_DIALOG_DATA) private data: DialogData) {}

  ngOnInit() {}

  checkCode() {
    // this.data.passHash === md5(this.inputCode)
  }

  onCorrectPasscode(e: any) {
    console.log('Passcode correct', e);
  }

  onWrongPasscode(atempts: any) {
    console.log('Passcode Fail', atempts);
  }
}

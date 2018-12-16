import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Md5 } from 'ts-md5/dist/md5';

export interface DialogData {
  passHash: string;
}

@Component({
  selector: 'app-lock-screen',
  templateUrl: './lock-screen.component.html',
  styleUrls: ['./lock-screen.component.scss']
})
export class LockScreenComponent implements OnInit {
  // @ViewChild('lockScreenContainer') lockScreenContainer: any;
  passCode: string;
  hashCode: string;
  // https://material.angular.io/components/dialog/overview
  constructor(public dialogRef: MatDialogRef<LockScreenComponent>, @Inject(MAT_DIALOG_DATA) private data: DialogData) {}

  ngOnInit() {}

  unlockScreen() {
    this.hashCode = <string>Md5.hashStr(this.passCode);
    if (!this.data.passHash || '' === this.data.passHash || this.hashCode === this.data.passHash) {
      this.dialogRef.close(true);
    }
    // this.data.passHash === md5(this.inputCode)
  }

  onCorrectPasscode(e: any) {
    console.log('Passcode correct', e);
  }

  onWrongPasscode(atempts: any) {
    console.log('Passcode Fail', atempts);
  }
}

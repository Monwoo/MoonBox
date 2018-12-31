import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Md5 } from 'ts-md5/dist/md5';
import { I18nService } from '@app/core';
import { extract } from '@app/core';
import { NotificationsService } from 'angular2-notifications';
import { SecuStorageService } from '@moon-box/services/secu-storage.service';

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
  haveEmptyPassCode: boolean = false;
  // https://material.angular.io/components/dialog/overview
  constructor(
    public dialogRef: MatDialogRef<LockScreenComponent>,
    @Inject(MAT_DIALOG_DATA) private data: DialogData,
    private i18nService: I18nService,
    private notif: NotificationsService,
    public storage: SecuStorageService
  ) {
    this.storage.checkPassCodeValidity('').then((ok: boolean) => {
      this.haveEmptyPassCode = ok;
    });
  }

  ngOnInit() {}

  async unlockScreen(e: any) {
    // this.hashCode = this.storage.toHex(this.passCode); //<string>Md5.hashStr(this.passCode);
    // if (!this.data.passHash || '' === this.data.passHash || this.hashCode === this.data.passHash) {
    if (this.haveEmptyPassCode || (await this.storage.checkPassCodeValidity(this.passCode))) {
      this.i18nService.get(extract('mb.lock-screen.unlock.success')).subscribe(t => {
        this.notif.success(t);
      });
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

import { DOCUMENT } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { WatermarkerService } from '../watermark-service/watermarker.service';

interface jobResult {
  jobEndedAt: string;
  jobStartedAt: string;
}

@Component({
  selector: 'app-results-dialog',
  templateUrl: './results-dialog.component.html',
  styleUrls: ['./results-dialog.component.scss'],
})
export class ResultsDialogComponent implements OnInit {
  public videoFile;
  public imgFile;
  public fileMetadata;

  public isLoading = true;
  public isSuccess = false;
  public isFailure = false;

  public objectUrl = '';

  constructor(
    public dialogRef: MatDialogRef<ResultsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public watermarkerService: WatermarkerService,
    @Inject(DOCUMENT) document
  ) {
    this.fileMetadata = this.data.fileData;
    this.videoFile = this.data.files[0];
    this.imgFile = this.data.files[1];

    console.log();
    console.log('this.filemetadata', this.fileMetadata);
    console.log('this.videoFile', this.videoFile);
    console.log('this.imgFile', this.imgFile);
    console.log();
  }

  ngOnInit(): void {
    if (
      this.fileMetadata !== null &&
      this.videoFile !== null &&
      this.imgFile !== null
    ) {
      this.generateWatermark();
    }
  }

  generateWatermark() {
    let jobID = null;
    let projectName = null;

    this.watermarkerService
      .postMethod([this.videoFile, this.imgFile], this.fileMetadata)
      .then((jobDetails) => {
        console.log('job id', jobDetails);
        console.log('job id', jobDetails.jobId);

        jobID = jobDetails.jobId;
        projectName = jobDetails.projectName;
        this.getProjectStatus(jobID, projectName);
      });
  }

  getProjectStatus(jobId, projectName) {
    console.log('GETTING PROJECT STATUS...');
    this.watermarkerService.getProjectStatus(jobId).subscribe((result: any) => {
      console.log(result);

      const res: jobResult = result;

      console.log('JOB STATUS', res);
      console.log('JOB STATUS', res.jobEndedAt);
      console.log('JOB STATUS', res.jobStartedAt);

      if (res.jobEndedAt === null) {
        console.log('JOB STILL RUNNING');
        setTimeout(() => {
          this.getProjectStatus(jobId, projectName);
        }, 5000);
      } else {
        console.log('--JOB COMPLETE--');
        this.watermarkerService
          .downloadWMFile(projectName, 'output.mp4')
          .subscribe((blob) => {
            this.isLoading = false;
            this.isSuccess = true;
            this.isFailure = false;

            console.log(blob);
            this.objectUrl = URL.createObjectURL(blob);

            this.download();

            /*setTimeout(() => {
              const clickHereBtn = document.getElementById(
                'downloadLink'
              ) as HTMLCollectionOf<HTMLElement>[0];
              console.log(clickHereBtn);

              clickHereBtn.setAttribute('href', objectUrl);
            }, 100); */
          });
      }
    });
  }

  download() {
    const a = document.createElement('a');
    console.log('objectUrl: ' + this.objectUrl);
    a.href = this.objectUrl;
    a.download = 'output.mp4';
    a.click();
    //URL.revokeObjectURL(this.objectUrl);
  }

  close() {
    this.dialogRef.close();
  }
}

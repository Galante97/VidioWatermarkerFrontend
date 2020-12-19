import { Component, ViewChild } from '@angular/core';
import { VideoProcessingService } from './video-processing-service';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'watermarker';

  constructor(
  ) {}



}

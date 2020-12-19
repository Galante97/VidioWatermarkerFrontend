import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable()
export class VideoProcessingService {
  constructor(@Inject(DOCUMENT) private document: Document) {}

  public promptForVideo(file: any): Promise<File> {
    console.log('FILE', file);

    if (file) {
      console.log('if file');
      return new Promise<File>((resolve, reject) => {
        resolve(file);
      });
    }

    console.log('promptForVideo');

    return new Promise<File>((resolve, reject) => {
      console.log('return promise');

      // make file input element in memory
      const fileInput: HTMLInputElement = this.document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'video/*';
      // fileInput.setAttribute('capture', 'camera');
      // fileInput['capture'] = 'camera';

      console.log('fileInput', fileInput);


      fileInput.addEventListener('error', (event) => {
        console.log('reject', event.error);
        reject(event.error);
      });
      fileInput.addEventListener('change', (event) => {
        console.log('RESOLVE', fileInput.files[0]);
        resolve(fileInput.files[0]);
      });
      // prompt for video file
      fileInput.click();
    });
  }

  public generateThumbnail(videoFile: Blob): Promise<string[]> {
    const video: HTMLVideoElement = this.document.createElement('video');
    const canvas: HTMLCanvasElement = this.document.createElement('canvas');
    const context: CanvasRenderingContext2D = canvas.getContext('2d');
    return new Promise<string[]>((resolve, reject) => {
      canvas.addEventListener('error', reject);
      video.addEventListener('error', reject);
      video.addEventListener('canplay', (event) => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        resolve([
          canvas.toDataURL(),
          canvas.width.toString(),
          canvas.height.toString(),
        ]);
      });
      if (videoFile.type) {
        video.setAttribute('type', videoFile.type);
      }
      video.preload = 'auto';
      video.src = window.URL.createObjectURL(videoFile);
      video.load();
    });
  }
}

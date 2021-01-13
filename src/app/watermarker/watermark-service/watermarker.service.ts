import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WatermarkerService {
  // redisURL = 'http://deepvidioservice.eba-je7zb9id.us-east-1.elasticbeanstalk.com/';
  // redisURL = 'http://localhost/';
  redisURL = 'https://api-prod.deepvid.io/'; 
  // redisURL = 'https://d1q8wj66mevzjd.cloudfront.net/';

  constructor(private http: HttpClient) {}

  getFlaskExample() {
    return this.http
      .get<any>(this.redisURL + 'testGetReq')
      .subscribe((data) => {
        console.log('testData', data);
      });
  }

  postMethod(files: File[], fileData: any): Promise<any> {
    console.log('FILES', files);

    const fileToUpload = files[0];
    const formData = new FormData();

    formData.append('files', files[0], files[0].name);
    formData.append('files', files[1], files[1].name);

    console.log(JSON.stringify(fileData));

    formData.append('WMData', JSON.stringify(fileData));

    // console.log('FORM', formData.getAll('WMData'));

    return this.http
      .post(this.redisURL + 'watermarker', formData)
      .pipe(catchError(this.handleError))
      .toPromise();
  }

  getProjectStatus(jobId: string) {
    const url = this.redisURL + 'watermarker/tasks/' + jobId;
    console.log('URL', url);
    return this.http.get(url);
  }

  downloadWMFile(projectName: string, outputfileName: string) {
   // const url =
   //   this.redisURL + 'static/projects/' + projectName + '/' + outputfileName;
   // console.log('DOWNLOAD HERE', url);
   // return this.http.get(url, { responseType: 'blob' });

    const url = this.redisURL + 'download/' + projectName + '/' + outputfileName;
    console.log('URL', url);
    return this.http.get(url, { responseType: 'blob' });

  }

  handleError(error: any): any {
    console.error(error);
    return throwError(error);
  }
}

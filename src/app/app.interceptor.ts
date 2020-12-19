import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable()
export class AppInterceptor implements HttpInterceptor {
  constructor() {}
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

   /* request = request.clone({
        setHeaders: {
            'Content-Type' : 'application/json',
            'Access-Control-Allow-Origin' : '*'
        }
      }); */


    console.log(request);

    return next.handle(request);
  }
}

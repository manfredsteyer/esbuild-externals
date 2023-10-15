import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  doStuff() {
    return "stuff done";
  }
}

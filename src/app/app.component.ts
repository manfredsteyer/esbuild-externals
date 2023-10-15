import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedService } from '@demo/shared';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'demo';
  service = inject(SharedService);
  
  constructor() {
    const stuff = this.service.doStuff();
    console.log('stuff', stuff);
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WorkbenchPageComponent } from './features/workbench/workbench-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, WorkbenchPageComponent],
  template: `
    <app-workbench-page></app-workbench-page>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #f1f5f9;
    }
  `]
})
export class AppComponent {}

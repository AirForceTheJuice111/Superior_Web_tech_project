import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WorkbenchPageComponent } from './features/workbench/workbench-page.component';
import { AiAssistantComponent } from './shared/components/ai-assistant.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, WorkbenchPageComponent, AiAssistantComponent],
  template: `
    <app-workbench-page></app-workbench-page>
    <app-ai-assistant></app-ai-assistant>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #f7f7f4;
    }
  `]
})
export class AppComponent {}

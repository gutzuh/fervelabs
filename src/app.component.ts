

import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini.service';
import { WebSocketService } from './services/websocket.service';
import { NeuralVisComponent } from './components/neural-vis/neural-vis.component';
import { ArchitectureComponent } from './components/architecture/architecture.component';
import { TerminalComponent } from './components/terminal/terminal.component';
import { ChatComponent } from './components/chat/chat.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { ProductivityComponent } from './components/productivity/productivity.component';
import { StudiesComponent } from './components/studies/studies.component';

type Tab = 'DASHBOARD' | 'NEURAL' | 'ARCHITECTURE' | 'TERMINAL' | 'CHAT' | 'PROJECTS' | 'PRODUCTIVITY' | 'STUDIES';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NeuralVisComponent, ArchitectureComponent, TerminalComponent, ChatComponent, ProjectsComponent, ProductivityComponent, StudiesComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  activeTab = signal<Tab>('DASHBOARD');
  geminiService = inject(GeminiService);
  wsService = inject(WebSocketService);

  // Computed values from WebSocket
  systemStats = this.wsService.systemStats;
  logs = this.wsService.logs;
  connected = this.wsService.connected;

  // Derived stats
  cpuPercent = computed(() => this.systemStats().cpu.toFixed(1));
  memoryPercent = computed(() => this.systemStats().memory.percent.toFixed(1));
  memoryUsedGB = computed(() => (this.systemStats().memory.used / 1024 / 1024 / 1024).toFixed(2));
  memoryTotalGB = computed(() => (this.systemStats().memory.total / 1024 / 1024 / 1024).toFixed(2));
  diskPercent = computed(() => this.systemStats().disk.percent.toFixed(1));

  setTab(tab: Tab) {
    this.activeTab.set(tab);
  }
}

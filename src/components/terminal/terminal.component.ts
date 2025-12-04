
import { Component, ElementRef, ViewChild, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebSocketService } from '../../services/websocket.service';

interface TerminalLine {
  type: 'command' | 'output' | 'error' | 'system';
  content: string;
  timestamp: string;
}

@Component({
  selector: 'app-terminal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col glass-panel rounded overflow-hidden">
      <!-- Header -->
      <div class="bg-black/40 p-2 border-b border-emerald-900/50 flex justify-between items-center px-4">
        <span class="text-xs font-bold text-emerald-400">JAMES TERMINAL - {{ wsService.connected() ? 'ONLINE' : 'OFFLINE' }}</span>
        <div class="flex gap-2">
          @if (wsService.connected()) {
            <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          } @else {
            <div class="w-3 h-3 rounded-full bg-red-500"></div>
          }
        </div>
      </div>

      <!-- Terminal Output -->
      <div #scrollContainer class="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed">
        @for (line of terminalHistory(); track $index) {
          <div 
            [class.text-emerald-500]="line.type === 'command'"
            [class.text-emerald-300]="line.type === 'output'"
            [class.text-red-400]="line.type === 'error'"
            [class.text-emerald-700]="line.type === 'system'"
          >
            @if (line.type === 'command') {
              <span class="text-emerald-600">➜</span> {{ line.content }}
            } @else if (line.type === 'system') {
              <span class="text-emerald-800">[{{ line.timestamp }}]</span> {{ line.content }}
            } @else {
              {{ line.content }}
            }
          </div>
        }
        
        @if (isExecuting()) {
          <div class="text-emerald-500 animate-pulse mt-2">
            ⚡ Executing...
          </div>
        }
      </div>

      <!-- Input -->
      <div class="p-3 bg-black/60 border-t border-emerald-900/50">
        <form (submit)="executeCommand()" class="flex gap-2 items-center">
          <span class="text-emerald-600">➜</span>
          <input 
            [(ngModel)]="currentInput" 
            name="currentInput"
            [disabled]="isExecuting() || !wsService.connected()"
            class="flex-1 bg-transparent border-none focus:ring-0 text-emerald-300 font-mono placeholder-emerald-900 focus:outline-none"
            placeholder="Enter command (e.g., ls, pwd, python --version)..."
            autocomplete="off"
          >
          <button 
            type="submit" 
            [disabled]="!currentInput.trim() || isExecuting() || !wsService.connected()" 
            class="text-emerald-500 hover:text-white disabled:opacity-30 transition-colors px-3 py-1 border border-emerald-900 rounded hover:border-emerald-500"
          >
            EXEC
          </button>
        </form>
        <div class="text-xs text-emerald-800 mt-2">
          Connected: {{ wsService.connected() ? 'YES' : 'NO' }} | Working Dir: {{ currentDir }}
        </div>
      </div>
    </div>
  `
})
export class TerminalComponent {
  wsService = inject(WebSocketService);
  currentInput = '';
  isExecuting = signal(false);
  currentDir = '~';
  terminalHistory = signal<TerminalLine[]>([
    {
      type: 'system',
      content: 'James Terminal v1.0 - Ready for commands',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor() {
    // Subscribe to terminal output from WebSocket
    effect(() => {
      const logs = this.wsService.logs();
      const lastLog = logs[0];

      if (lastLog && lastLog.source === 'TERMINAL') {
        // Handle terminal-specific messages
        if (lastLog.message.startsWith('Executing:')) {
          this.isExecuting.set(true);
        }
      }
    });

    // Auto-scroll on new messages
    effect(() => {
      this.terminalHistory();
      setTimeout(() => {
        if (this.scrollContainer) {
          this.scrollContainer.nativeElement.scrollTop =
            this.scrollContainer.nativeElement.scrollHeight;
        }
      }, 50);
    });
  }

  executeCommand() {
    if (!this.currentInput.trim() || this.isExecuting()) return;

    const command = this.currentInput.trim();
    this.currentInput = '';

    // Add command to history
    this.terminalHistory.update(h => [...h, {
      type: 'command',
      content: command,
      timestamp: new Date().toLocaleTimeString()
    }]);

    // Send to backend
    this.wsService.sendCommand(command);
    this.isExecuting.set(true);

    // Listen for response (simulated timeout for now)
    setTimeout(() => {
      this.isExecuting.set(false);
    }, 5000);
  }
}

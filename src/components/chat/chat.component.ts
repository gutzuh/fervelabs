
import { Component, ElementRef, ViewChild, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebSocketService } from '../../services/websocket.service';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="h-full flex flex-col glass-panel rounded overflow-hidden">
      <!-- Header -->
      <div class="bg-black/40 p-2 border-b border-emerald-900/50 flex justify-between items-center px-4">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-emerald-400">JAMES AI ASSISTANT</span>
          @if (wsService.connected()) {
            <span class="text-xs text-emerald-600">(Ollama {{ ollamaStatus() }})</span>
          }
        </div>
        <div class="flex gap-2">
          @if (wsService.connected()) {
            <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          } @else {
            <div class="w-3 h-3 rounded-full bg-red-500"></div>
          }
        </div>
      </div>

      <!-- Chat Messages -->
      <div #scrollContainer class="flex-1 overflow-y-auto p-4 space-y-3">
        @for (msg of chatHistory(); track $index) {
          <div 
            class="flex"
            [class.justify-end]="msg.role === 'user'"
          >
            <div 
              class="max-w-[80%] px-4 py-2 rounded-lg"
              [class.bg-emerald-600/20]="msg.role === 'user'"
              [class.bg-emerald-900/30]="msg.role === 'assistant'"
              [class.border]="true"
              [class.border-emerald-500]="msg.role === 'user'"
              [class.border-emerald-800]="msg.role === 'assistant'"
            >
              @if (msg.role === 'assistant') {
                <div class="text-xs text-emerald-700 mb-1">JAMES ➜</div>
              }
              <div class="text-sm text-emerald-200 whitespace-pre-wrap">{{ msg.content }}</div>
              <div class="text-xs text-emerald-800 mt-1">{{ msg.timestamp }}</div>
            </div>
          </div>
        }
        
        @if (isProcessing()) {
          <div class="flex">
            <div class="max-w-[80%] px-4 py-2 rounded-lg bg-emerald-900/30 border border-emerald-800">
              <div class="text-xs text-emerald-700 mb-1">JAMES ➜</div>
              <div class="text-sm text-emerald-500 animate-pulse">Thinking...</div>
            </div>
          </div>
        }
      </div>

      <!-- Input -->
      <div class="p-4 bg-black/60 border-t border-emerald-900/50">
        <form (submit)="sendMessage()" class="space-y-2">
          <textarea
            [(ngModel)]="currentMessage"
            name="currentMessage"
            [disabled]="isProcessing() || !wsService.connected()"
            class="w-full bg-black/40 border border-emerald-900 rounded px-3 py-2 text-emerald-300 placeholder-emerald-900 focus:outline-none focus:border-emerald-500 resize-none font-mono text-sm"
            placeholder="Ask James anything... (e.g., How do I install Ollama?)"
            rows="3"
            (keydown.enter)="onEnterPress($event)"
          ></textarea>
          <div class="flex justify-between items-center">
            <div class="text-xs text-emerald-800">
              {{ wsService.connected() ? 'Connected' : 'Disconnected' }} | Press Shift+Enter to send
            </div>
            <button 
              type="submit" 
              [disabled]="!currentMessage.trim() || isProcessing() || !wsService.connected()" 
              class="text-emerald-500 hover:text-white disabled:opacity-30 transition-colors px-4 py-2 border border-emerald-900 rounded hover:border-emerald-500"
            >
              SEND
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ChatComponent {
    wsService = inject(WebSocketService);
    currentMessage = '';
    isProcessing = signal(false);
    ollamaStatus = signal('Not Installed');
    chatHistory = signal<ChatMessage[]>([
        {
            role: 'assistant',
            content: 'Hello! I\'m James, your personal AI assistant. I can help you with:\n\n• Local development setup\n• Code explanations\n• System automation\n• General questions\n\nHow can I help you today?',
            timestamp: new Date().toLocaleTimeString()
        }
    ]);

    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

    constructor() {
        // Listen for AI responses
        effect(() => {
            const logs = this.wsService.logs();
            const lastLog = logs[0];

            if (lastLog && lastLog.source === 'AI') {
                if (lastLog.message.startsWith('AI:')) {
                    const response = lastLog.message.replace('AI: ', '');
                    this.chatHistory.update(h => [...h, {
                        role: 'assistant',
                        content: response,
                        timestamp: lastLog.timestamp
                    }]);
                    this.isProcessing.set(false);
                }
            }
        });

        // Auto-scroll
        effect(() => {
            this.chatHistory();
            setTimeout(() => {
                if (this.scrollContainer) {
                    this.scrollContainer.nativeElement.scrollTop =
                        this.scrollContainer.nativeElement.scrollHeight;
                }
            }, 50);
        });
    }

    sendMessage() {
        if (!this.currentMessage.trim() || this.isProcessing()) return;

        const message = this.currentMessage.trim();
        this.currentMessage = '';

        // Add user message to history
        this.chatHistory.update(h => [...h, {
            role: 'user',
            content: message,
            timestamp: new Date().toLocaleTimeString()
        }]);

        // Send to backend
        this.wsService.sendAIMessage(message);
        this.isProcessing.set(true);
    }

    onEnterPress(event: KeyboardEvent) {
        if (event.shiftKey && event.key === 'Enter') {
            event.preventDefault();
            this.sendMessage();
        }
    }
}

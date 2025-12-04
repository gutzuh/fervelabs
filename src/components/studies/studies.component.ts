
import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../services/websocket.service';

@Component({
    selector: 'app-studies',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="h-full overflow-y-auto p-6 space-y-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-emerald-400">📚 Estudos</h2>
        <button 
          (click)="refreshAnki()"
          class="px-4 py-2 bg-emerald-900/30 border border-emerald-700 rounded hover:bg-emerald-800/50 transition-colors"
        >
          🔄 Atualizar
        </button>
      </div>

      <!-- Anki Stats -->
      <div class="glass-panel p-6 rounded-lg border-l-4 border-purple-500">
        <h3 class="text-xl font-bold text-white mb-4">🎴 Anki Flashcards</h3>
        
        @if (ankiStats()) {
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="text-center p-4 bg-black/40 rounded">
              <div class="text-3xl font-bold text-purple-400">{{ ankiStats().total_decks }}</div>
              <div class="text-sm text-emerald-700">Decks</div>
            </div>
            <div class="text-center p-4 bg-black/40 rounded">
              <div class="text-3xl font-bold text-purple-400">{{ ankiStats().total_size_mb }} MB</div>
              <div class="text-sm text-emerald-700">Total</div>
            </div>
            <div class="text-center p-4 bg-black/40 rounded">
              <div class="text-3xl font-bold text-purple-400">{{ getTopicCount() }}</div>
              <div class="text-sm text-emerald-700">Categorias</div>
            </div>
          </div>

          <!-- Topics -->
          <div class="mb-4">
            <div class="text-sm font-bold text-emerald-400 mb-2">Por Categoria:</div>
            <div class="grid grid-cols-2 gap-2">
              @for (topic of Object.keys(ankiStats().topics); track topic) {
                <div class="p-2 bg-black/40 rounded flex justify-between">
                  <span class="text-emerald-300">{{ topic }}</span>
                  <span class="text-purple-400 font-bold">{{ ankiStats().topics[topic] }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Deck List -->
          <div>
            <div class="text-sm font-bold text-emerald-400 mb-2">Seus Decks:</div>
            <div class="space-y-2">
              @for (deck of ankiStats().decks; track deck.name) {
                <div class="p-3 bg-black/40 rounded border border-emerald-900 hover:border-emerald-600 transition-colors">
                  <div class="flex justify-between items-center">
                    <div>
                      <div class="text-emerald-300">{{ deck.name }}</div>
                      <div class="text-xs text-emerald-800">Modificado: {{ deck.modified }}</div>
                    </div>
                    <div class="text-xs text-purple-400">
                      {{ formatSize(deck.size) }}
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="text-center text-emerald-700 py-8">Carregando...</div>
        }
      </div>

      <!-- File Organizer -->
      <div class="glass-panel p-6 rounded-lg border-l-4 border-orange-500">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-white">📁 Downloads</h3>
          <button 
            (click)="scanDownloads()"
            class="px-3 py-1 text-sm bg-orange-900/30 border border-orange-700 rounded hover:bg-orange-700/50 transition-colors"
          >
            Escanear
          </button>
        </div>

        @if (downloadFiles().length > 0) {
          <div class="mb-4 text-sm text-emerald-400">
            {{ downloadFiles().length }} arquivos encontrados
          </div>
          
          <div class="space-y-2 max-h-96 overflow-y-auto">
            @for (file of downloadFiles().slice(0, 20); track file.name) {
              <div class="p-2 bg-black/40 rounded flex justify-between items-center text-xs">
                <div class="flex-1 truncate">
                  <span class="text-emerald-300">{{ file.name }}</span>
                </div>
                <div class="flex gap-2 items-center">
                  <span class="text-emerald-800">{{ formatDate(file.modified) }}</span>
                  <span class="px-2 py-1 bg-orange-900/50 rounded">{{ file.type }}</span>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Context Switcher -->
      <div class="glass-panel p-6 rounded-lg border-l-4 border-blue-500">
        <h3 class="text-xl font-bold text-white mb-4">🔄 Modo de Trabalho</h3>
        
        <div class="grid grid-cols-3 gap-4">
          @for (context of contexts; track context.id) {
            <button
              (click)="switchContext(context.id)"
              class="p-4 bg-black/40 rounded border border-emerald-900 hover:border-blue-500 hover:bg-blue-900/20 transition-all group"
            >
              <div class="text-3xl mb-2">{{ context.icon }}</div>
              <div class="text-emerald-300 font-bold mb-1">{{ context.name }}</div>
              <div class="text-xs text-emerald-800">{{ context.description }}</div>
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class StudiesComponent {
    wsService = inject(WebSocketService);
    ankiStats = signal<any>(null);
    downloadFiles = signal<any[]>([]);
    Object = Object;

    contexts = [
        { id: 'DEV', icon: '💻', name: 'Desenvolvimento', description: 'VS Code + Browser' },
        { id: 'STUDY', icon: '📚', name: 'Estudos', description: 'Anki + PDFs' },
        { id: 'FOCUS', icon: '🎯', name: 'Foco Total', description: 'Sem distrações' }
    ];

    constructor() {
        this.refreshAnki();
    }

    refreshAnki() {
        if (this.wsService.connected()) {
            this.wsService.ws?.send(JSON.stringify({ type: 'get_anki_stats' }));
        }
    }

    scanDownloads() {
        if (this.wsService.connected()) {
            this.wsService.ws?.send(JSON.stringify({ type: 'scan_downloads' }));
        }
    }

    switchContext(contextId: string) {
        if (this.wsService.connected()) {
            this.wsService.ws?.send(JSON.stringify({
                type: 'switch_context',
                context: contextId
            }));
        }
    }

    getTopicCount(): number {
        return this.ankiStats() ? Object.keys(this.ankiStats().topics).length : 0;
    }

    formatSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    }

    formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
}

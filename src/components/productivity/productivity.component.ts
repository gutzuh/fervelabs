
import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WebSocketService } from '../../services/websocket.service';

@Component({
    selector: 'app-productivity',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="h-full overflow-y-auto p-6 space-y-6">
      <!-- Pomodoro Timer -->
      <div class="glass-panel p-6 rounded-lg border-l-4 border-red-500">
        <h3 class="text-xl font-bold text-white mb-4">🍅 Pomodoro Timer</h3>
        
        @if (pomodoroStatus().active) {
          <div class="text-center">
            <div class="text-6xl font-bold text-red-400 mb-4">
              {{ pomodoroStatus().remaining_minutes }}:00
            </div>
            <div class="text-emerald-400 mb-4">
              {{ pomodoroStatus().type === 'work' ? '💼 Trabalhando' : '☕ Pausa' }}
            </div>
            <div class="text-sm text-emerald-700">
              Pomodoros completos: {{ pomodoroStatus().count }}
            </div>
          </div>
        } @else {
          <div class="text-center">
            <div class="text-emerald-700 mb-4">Timer parado</div>
            <div class="flex gap-2 justify-center">
              <button
                (click)="startPomodoro(25)"
                class="px-6 py-3 bg-red-900/30 border border-red-700 rounded hover:bg-red-700/50 transition-colors"
              >
                🍅 25 minutos
              </button>
              <button
                (click)="startPomodoro(5)"
                class="px-6 py-3 bg-blue-900/30 border border-blue-700 rounded hover:bg-blue-700/50 transition-colors"
              >
                ☕ 5 minutos
              </button>
            </div>
            @if (pomodoroStatus().count > 0) {
              <div class="text-sm text-emerald-700 mt-4">
                Total hoje: {{ pomodoroStatus().count }} Pomodoros
              </div>
            }
          </div>
        }
      </div>

      <!-- Quick Actions -->
      <div class="glass-panel p-6 rounded-lg border-l-4 border-purple-500">
        <h3 class="text-xl font-bold text-white mb-4">⚡ Quick Actions</h3>
        
        <div class="grid grid-cols-2 gap-3">
          @for (category of quickActionsCategories; track category.name) {
            <div class="p-3 bg-black/40 rounded">
              <div class="text-sm font-bold text-emerald-400 mb-2">{{ category.label }}</div>
              <div class="space-y-1">
                @for (action of category.actions; track action.cmd) {
                  <button
                    (click)="runQuickAction(action.cmd)"
                    class="w-full text-left px-2 py-1 text-xs bg-emerald-900/20 border border-emerald-900 rounded hover:border-emerald-600 transition-colors"
                  >
                    {{ action.label }}
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Tasks -->
      <div class="glass-panel p-6 rounded-lg border-l-4 border-blue-500">
        <h3 class="text-xl font-bold text-white mb-4">✓ Tasks</h3>
        
        <form (submit)="addTask()" class="flex gap-2 mb-4">
          <input
            [(ngModel)]="newTaskText"
            name="newTaskText"
            placeholder="Nova tarefa..."
            class="flex-1 px-3 py-2 bg-black/40 border border-emerald-900 rounded text-emerald-300 placeholder-emerald-900 focus:outline-none focus:border-emerald-500"
          >
          <button
            type="submit"
            class="px-4 py-2 bg-blue-900/30 border border-blue-700 rounded hover:bg-blue-700/50 transition-colors"
          >
            + Adicionar
          </button>
        </form>

        <div class="space-y-2">
          @for (task of tasks(); track task.id) {
            <div 
              class="flex items-center gap-3 p-3 bg-black/40 rounded border border-emerald-900"
              [class.opacity-50]="task.completed"
            >
              <input
                type="checkbox"
                [checked]="task.completed"
                (change)="toggleTask(task.id)"
                class="w-4 h-4"
              >
              <span 
                class="flex-1 text-emerald-300"
                [class.line-through]="task.completed"
              >
                {{ task.text }}
              </span>
              <span class="text-xs text-emerald-800">{{ formatTime(task.created_at) }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class ProductivityComponent {
    wsService = inject(WebSocketService);
    pomodoroStatus = signal({
        active: false,
        type: 'work',
        remaining_minutes: 25,
        count: 0
    });
    tasks = signal<any[]>([]);
    newTaskText = '';

    quickActionsCategories = [
        {
            name: 'git',
            label: '🌿 Git',
            actions: [
                { label: 'Status', cmd: 'git status' },
                { label: 'Pull', cmd: 'git pull' },
                { label: 'Log', cmd: 'git log --oneline -10' }
            ]
        },
        {
            name: 'docker',
            label: '🐳 Docker',
            actions: [
                { label: 'PS', cmd: 'docker ps' },
                { label: 'Images', cmd: 'docker images' },
                { label: 'Prune', cmd: 'docker system prune -f' }
            ]
        },
        {
            name: 'system',
            label: '💻 System',
            actions: [
                { label: 'Ports', cmd: 'lsof -i -P -n | grep LISTEN' },
                { label: 'Disk', cmd: 'df -h' },
                { label: 'Memory', cmd: 'free -h' }
            ]
        },
        {
            name: 'node',
            label: '📦 Node',
            actions: [
                { label: 'Version', cmd: 'node --version && npm --version' },
                { label: 'Outdated', cmd: 'npm outdated' }
            ]
        }
    ];

    constructor() {
        this.refreshStatus();
        this.getTasks();

        // Poll for pomodoro status
        setInterval(() => this.refreshStatus(), 5000);
    }

    refreshStatus() {
        if (this.wsService.connected()) {
            this.wsService.ws?.send(JSON.stringify({ type: 'pomodoro_status' }));
        }
    }

    startPomodoro(duration: number) {
        this.wsService.ws?.send(JSON.stringify({
            type: 'start_pomodoro',
            duration
        }));
    }

    runQuickAction(command: string) {
        this.wsService.sendCommand(command);
    }

    addTask() {
        if (!this.newTaskText.trim()) return;

        this.wsService.ws?.send(JSON.stringify({
            type: 'add_task',
            text: this.newTaskText.trim()
        }));

        this.newTaskText = '';
        setTimeout(() => this.getTasks(), 200);
    }

    toggleTask(taskId: number) {
        this.wsService.ws?.send(JSON.stringify({
            type: 'toggle_task',
            task_id: taskId
        }));
        setTimeout(() => this.getTasks(), 200);
    }

    getTasks() {
        this.wsService.ws?.send(JSON.stringify({ type: 'get_tasks' }));
    }

    formatTime(isoString: string): string {
        return new Date(isoString).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

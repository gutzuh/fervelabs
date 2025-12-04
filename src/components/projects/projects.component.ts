
import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService } from '../../services/websocket.service';

interface Project {
    name: string;
    path: string;
    type: string;
    commands: { [key: string]: string };
    git_enabled: boolean;
    favorite: boolean;
}

interface GitStatus {
    branch: string;
    changes: string[];
    last_commit: string;
    has_changes: boolean;
}

@Component({
    selector: 'app-projects',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="h-full overflow-y-auto p-6 space-y-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-emerald-400">Meus Projetos</h2>
        <button 
          (click)="refreshProjects()"
          class="px-4 py-2 bg-emerald-900/30 border border-emerald-700 rounded hover:bg-emerald-800/50 transition-colors"
        >
          🔄 Atualizar
        </button>
      </div>

      @for (item of projectsList(); track item.id) {
        <div class="glass-panel p-6 rounded-lg border-l-4" [class.border-emerald-500]="item.project.favorite" [class.border-emerald-800]="!item.project.favorite">
          <!-- Project Header -->
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-xl font-bold text-white">{{ item.project.name }}</h3>
              <p class="text-xs text-emerald-700 font-mono mt-1">{{ item.project.path }}</p>
              <span class="inline-block mt-2 px-2 py-1 text-xs bg-emerald-900/50 border border-emerald-800 rounded">
                {{ item.project.type }}
              </span>
            </div>
            @if (item.project.favorite) {
              <span class="text-2xl">⭐</span>
            }
          </div>

          <!-- Git Status -->
          @if (item.project.git_enabled && item.gitStatus) {
            <div class="mb-4 p-3 bg-black/40 rounded border border-emerald-900/50">
              <div class="flex justify-between items-center mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-sm text-emerald-400">🌿 {{ item.gitStatus.branch }}</span>
                  @if (item.gitStatus.has_changes) {
                    <span class="text-xs text-orange-400">● Changes</span>
                  } @else {
                    <span class="text-xs text-emerald-600">✓ Clean</span>
                  }
                </div>
                <button 
                  (click)="gitPull(item.id)"
                  class="text-xs px-3 py-1 border border-emerald-800 rounded hover:border-emerald-500 transition-colors"
                >
                  ⬇️ Pull
                </button>
              </div>
              @if (item.gitStatus.last_commit) {
                <p class="text-xs text-emerald-700">Last: {{ item.gitStatus.last_commit }}</p>
              }
              @if (item.gitStatus.changes.length > 0) {
                <div class="mt-2 text-xs text-orange-300 space-y-1">
                  @for (change of item.gitStatus.changes.slice(0, 3); track $index) {
                    <div>{{ change }}</div>
                  }
                </div>
              }
            </div>
          }

          <!-- Quick Actions -->
          <div class="flex flex-wrap gap-2 mb-4">
            @for (cmd of getProjectCommands(item.project); track cmd.key) {
              <button
                (click)="runCommand(item.id, cmd.key)"
                class="px-3 py-2 text-sm bg-emerald-900/30 border border-emerald-800 rounded hover:bg-emerald-700/50 hover:border-emerald-500 transition-all"
              >
                {{ cmd.label }}
              </button>
            }
            <button
              (click)="openInVSCode(item.id)"
              class="px-3 py-2 text-sm bg-blue-900/30 border border-blue-800 rounded hover:bg-blue-700/50 transition-all"
            >
              📝 VS Code
            </button>
          </div>

          <!-- Command Output -->
          @if (item.commandOutput) {
            <div class="mt-4 p-3 bg-black rounded font-mono text-xs">
              <div class="text-emerald-600 mb-2">Output:</div>
              <pre class="text-emerald-300 whitespace-pre-wrap">{{ item.commandOutput }}</pre>
            </div>
          }
        </div>
      }

      @if (projectsList().length === 0) {
        <div class="text-center text-emerald-700 py-12">
          <p>Nenhum projeto configurado ainda.</p>
          <p class="text-sm mt-2">Configure seus projetos em python_core/projects/manager.py</p>
        </div>
      }
    </div>
  `
})
export class ProjectsComponent {
    wsService = inject(WebSocketService);
    projectsList = signal<any[]>([]);

    constructor() {
        this.refreshProjects();

        // Listen for project updates
        effect(() => {
            const logs = this.wsService.logs();
            // Handle project-related messages
        });
    }

    refreshProjects() {
        if (this.wsService.connected()) {
            this.wsService.ws?.send(JSON.stringify({ type: 'get_projects' }));

            // Also get git status for each
            setTimeout(() => {
                this.projectsList().forEach(p => {
                    if (p.project.git_enabled) {
                        this.wsService.ws?.send(JSON.stringify({
                            type: 'git_status',
                            project_id: p.id
                        }));
                    }
                });
            }, 500);
        }
    }

    getProjectCommands(project: Project) {
        return Object.keys(project.commands).map(key => ({
            key,
            label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')
        }));
    }

    runCommand(projectId: string, commandKey: string) {
        this.wsService.ws?.send(JSON.stringify({
            type: 'project_command',
            project_id: projectId,
            command: commandKey
        }));

        // Add loading state
        this.projectsList.update(list =>
            list.map(p => p.id === projectId ? { ...p, commandOutput: '⏳ Executando...' } : p)
        );
    }

    gitPull(projectId: string) {
        this.wsService.ws?.send(JSON.stringify({
            type: 'git_pull',
            project_id: projectId
        }));
    }

    openInVSCode(projectId: string) {
        this.wsService.ws?.send(JSON.stringify({
            type: 'open_vscode',
            project_id: projectId
        }));
    }
}

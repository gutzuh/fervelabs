
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';
import { MarkdownPipe } from '../../pipes/markdown.pipe';

@Component({
  selector: 'app-architecture',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  template: `
    <div class="h-full flex flex-col gap-6">
      <div class="glass-panel p-6 rounded">
        <h2 class="text-xl font-bold text-white mb-4">Gerador de Estratégia & Lab</h2>
        <p class="text-emerald-500 text-sm mb-4">
          Utilize este módulo para gerar guias práticos, códigos e arquiteturas para o seu Laboratório Local Ferve.
        </p>
        
        <div class="mb-4">
            <div class="flex justify-between items-end mb-2">
                <label class="text-xs uppercase text-emerald-700 font-bold">Configuração do Prompt</label>
                <select 
                    (change)="loadPreset($event)" 
                    class="bg-black/50 border border-emerald-900 text-emerald-400 text-xs rounded px-2 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer">
                    <option value="" disabled selected>-- CARREGAR PRESET --</option>
                    @for(preset of presets; track preset.label) {
                        <option [value]="preset.value">{{ preset.label }}</option>
                    }
                </select>
            </div>
            <textarea 
                [(ngModel)]="prompt" 
                class="w-full h-32 bg-black/50 border border-emerald-900 rounded p-4 text-sm text-emerald-300 focus:outline-none focus:border-emerald-500 font-mono resize-none"
            ></textarea>
        </div>

        <div class="flex flex-col md:flex-row gap-4 md:items-center justify-between">
            <button 
                (click)="generateDocs()" 
                [disabled]="loading() || !geminiService.isConfigured()"
                class="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-2 px-6 rounded transition-all flex items-center">
                @if(loading()) {
                    <span class="animate-spin mr-2">⟳</span> PROCESSANDO...
                } @else {
                    GERAR BLUEPRINT
                }
            </button>

            <div class="flex gap-4 text-xs items-center bg-black/30 px-3 py-2 rounded border border-emerald-900/50">
                <span class="text-emerald-700 font-bold uppercase">Refs:</span>
                <a href="https://ollama.com/" target="_blank" class="text-emerald-400 hover:text-white underline decoration-emerald-700 hover:decoration-white transition-all flex items-center">
                    Ollama (Local AI) <span class="ml-1 text-[10px]">↗</span>
                </a>
                <span class="text-emerald-800">|</span>
                <a href="https://github.com/mlech26l/ncps" target="_blank" class="text-emerald-400 hover:text-white underline decoration-emerald-700 hover:decoration-white transition-all flex items-center">
                    Neural Circuit Policies <span class="ml-1 text-[10px]">↗</span>
                </a>
            </div>
        </div>

        @if(!geminiService.isConfigured()) {
            <p class="text-red-500 text-xs mt-2">API KEY NECESSÁRIA NO ENV</p>
        }
      </div>

      <div class="glass-panel p-6 rounded flex-1 overflow-y-auto relative">
        @if(result()) {
            <div class="prose prose-invert prose-emerald max-w-none font-mono text-sm" [innerHTML]="result() | markdown"></div>
        } @else {
            <div class="absolute inset-0 flex items-center justify-center text-emerald-900 flex-col">
                <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                <p>AGUARDANDO COMANDO...</p>
            </div>
        }
      </div>
    </div>
  `
})
export class ArchitectureComponent {
  geminiService = inject(GeminiService);
  loading = signal(false);
  result = signal('');
  
  presets = [
    {
        label: 'Guia Prático: Setup Local (Ollama + Python)',
        value: `Atue como um Engenheiro de MLOps Sênior. Crie um guia prático "mão na massa" para montar o ambiente Ferve Labs localmente.
        
Cubra os seguintes pontos em Português:
1. Instalação do Ollama e como baixar o modelo 'llama3' ou 'mistral'.
2. Script Python básico para interagir com o modelo localmente (sem internet).
3. Como criar uma "Memória de Curto Prazo" simples usando um arquivo JSON ou SQLite local para que o modelo lembre das conversas anteriores.
4. Exemplo de código.`
    },
    {
        label: 'Conceito: Redes Neurais Líquidas (LNNs)',
        value: `Explique o conceito de "Liquid Neural Networks" (LNNs) de forma técnica mas acessível, em Português.

1. Qual a diferença matemática real entre um Transformer (GPT) e uma LNN?
2. Como usar a biblioteca 'ncps' (Neural Circuit Policies) em Python para criar um modelo simples de previsão de séries temporais?
3. Forneça um exemplo de código Python usando PyTorch e NCPS.`
    },
    {
        label: 'Conceito: Mesh Descentralizado (Zenoh/MQTT)',
        value: `Desenhe a arquitetura de comunicação para dispositivos IoT locais (Raspberry Pi, ESP32) sem usar nuvem.

1. Explique por que usar Zenoh.io ou MQTT.
2. Crie um diagrama de fluxo (em texto) mostrando como um sensor envia dados para o computador principal, que processa no Ollama e devolve uma ação.
3. Roadmap de hardware sugerido para iniciantes.`
    },
    {
        label: 'Manifesto Ferve Labs (Visão Geral)',
        value: `Gere o Whitepaper técnico do projeto Ferve Labs em Português.
        
Pilares:
1. Arquitetura "Liquid State" (LNNs + Aprendizado Contínuo)
2. Digital-Physical Mesh (Edge Computing/P2P)
3. Antifragilidade & Inferência Ativa (Daemon Proativo)

Gere: Resumo Executivo, Stack Tecnológica Recomendada e Roadmap de MVP de 6 meses.`
    }
  ];

  // Pre-filled with the Real World Guide
  prompt = this.presets[0].value;

  loadPreset(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.prompt = select.value;
  }

  async generateDocs() {
    this.loading.set(true);
    try {
        const response = await this.geminiService.generateArchitectureDocs(this.prompt);
        this.result.set(response);
    } catch (e) {
        this.result.set('Erro: Não foi possível conectar ao núcleo neural (Erro de API).');
    } finally {
        this.loading.set(false);
    }
  }
}

import { Injectable, signal } from '@angular/core';

export interface SystemStats {
    cpu: number;
    memory: {
        used: number;
        total: number;
        percent: number;
    };
    disk: {
        used: number;
        total: number;
        percent: number;
    };
}

export interface LogEntry {
    timestamp: string;
    message: string;
    source: string;
}

export interface TerminalOutput {
    success: boolean;
    stdout?: string;
    stderr?: string;
    error?: string;
    exit_code?: number;
}

export interface AIResponse {
    message: string;
    timestamp: string;
}

@Injectable({
    providedIn: 'root'
})
export class WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectTimeout: any;

    public connected = signal(false);
    public systemStats = signal<SystemStats>({
        cpu: 0,
        memory: { used: 0, total: 1, percent: 0 },
        disk: { used: 0, total: 1, percent: 0 }
    });
    public logs = signal<LogEntry[]>([]);
    public terminalOutput = signal<TerminalOutput | null>(null);
    public aiResponse = signal<AIResponse | null>(null);

    constructor() {
        this.connect();
    }

    private connect() {
        try {
            this.ws = new WebSocket('ws://localhost:8765');

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.connected.set(true);
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (e) {
                    console.error('Failed to parse message:', e);
                }
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected. Retrying in 5s...');
                this.connected.set(false);
                this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (e) {
            console.error('Failed to connect:', e);
            this.reconnectTimeout = setTimeout(() => this.connect(), 5000);
        }
    }

    private handleMessage(message: any) {
        switch (message.type) {
            case 'system_stats':
                this.systemStats.set(message.data);
                break;
            case 'log':
                this.logs.update(logs => [message.data, ...logs].slice(0, 50));
                break;
            case 'terminal_output':
                this.terminalOutput.set(message.data);
                // Also add to logs with formatted output
                const output = message.data.stdout || message.data.stderr || message.data.error || 'Command completed';
                this.logs.update(logs => [{
                    timestamp: new Date().toLocaleTimeString(),
                    message: output,
                    source: 'TERMINAL'
                }, ...logs].slice(0, 50));
                break;
            case 'ai_response':
                this.aiResponse.set(message.data);
                this.logs.update(logs => [{
                    timestamp: message.data.timestamp,
                    message: `AI: ${message.data.message}`,
                    source: 'AI'
                }, ...logs].slice(0, 50));
                break;
        }
    }

    sendCommand(command: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'terminal_command',
                command: command
            }));
        }
    }

    sendAIMessage(message: string) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'ai_chat',
                message: message
            }));
        }
    }
}

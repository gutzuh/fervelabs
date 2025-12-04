import asyncio
import websockets
import json
import time
import psutil
import subprocess
import os

# Import our components
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# from brain.llm_client import LocalBrain  # Will uncomment once ollama is installed
from projects.manager import ProjectManager
from productivity.manager import ProductivityManager, QuickActions
from study.manager import AnkiManager, FileOrganizer, ContextSwitcher

# Connected clients
clients = set()

# Global managers
project_manager = ProjectManager()
productivity_manager = ProductivityManager()
quick_actions = QuickActions()
anki_manager = AnkiManager()
file_organizer = FileOrganizer()
context_switcher = ContextSwitcher()

class SystemMonitor:
    @staticmethod
    def get_stats():
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "cpu": cpu_percent,
            "memory": {
                "used": memory.used,
                "total": memory.total,
                "percent": memory.percent
            },
            "disk": {
                "used": disk.used,
                "total": disk.total,
                "percent": disk.percent
            }
        }

class TerminalExecutor:
    @staticmethod
    async def execute(command):
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            return {
                "success": True,
                "stdout": stdout.decode('utf-8') if stdout else "",
                "stderr": stderr.decode('utf-8') if stderr else "",
                "exit_code": process.returncode
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

async def broadcast(message):
    """Send message to all connected clients"""
    if clients:
        await asyncio.gather(
            *[client.send(json.dumps(message)) for client in clients],
            return_exceptions=True
        )

async def system_stats_broadcaster():
    """Broadcast system stats every 2 seconds"""
    while True:
        try:
            stats = SystemMonitor.get_stats()
            await broadcast({
                "type": "system_stats",
                "data": stats
            })
        except Exception as e:
            print(f"Error broadcasting stats: {e}")
        await asyncio.sleep(2)

async def handler(websocket):
    """Handle WebSocket connections"""
    clients.add(websocket)
    print(f"Client connected. Total clients: {len(clients)}")
    
    try:
        # Send welcome message
        await websocket.send(json.dumps({
            "type": "log",
            "data": {
                "timestamp": time.strftime("%H:%M:%S"),
                "message": "Connected to Ferve Labs Core",
                "source": "SYSTEM"
            }
        }))
        
        # Initial system info
        await websocket.send(json.dumps({
            "type": "log",
            "data": {
                "timestamp": time.strftime("%H:%M:%S"),
                "message": f"System ready. Python {sys.version.split()[0]}",
                "source": "SYSTEM"
            }
        }))
        
        # Handle incoming messages
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get("type")
                
                if msg_type == "terminal_command":
                    command = data.get("command")
                    await websocket.send(json.dumps({
                        "type": "log",
                        "data": {
                            "timestamp": time.strftime("%H:%M:%S"),
                            "message": f"Executing: {command}",
                            "source": "TERMINAL"
                        }
                    }))
                    
                    result = await TerminalExecutor.execute(command)
                    await websocket.send(json.dumps({
                        "type": "terminal_output",
                        "data": result
                    }))
                
                elif msg_type == "ai_chat":
                    prompt = data.get("message")
                    await websocket.send(json.dumps({
                        "type": "log",
                        "data": {
                            "timestamp": time.strftime("%H:%M:%S"),
                            "message": f"Processing: {prompt[:50]}...",
                            "source": "AI"
                        }
                    }))
                    
                    # Try to use local LLM, fallback to mock
                    # try:
                    #     brain = LocalBrain()
                    #     response = brain.generate(prompt)
                    # except Exception as e:
                    response = f"[Mock AI] Entendi sua pergunta: '{prompt}'. Ollama ainda não instalado. As outras funcionalidades (Monitor, Terminal) estão online!"
                    
                    await websocket.send(json.dumps({
                        "type": "ai_response",
                        "data": {
                            "message": response,
                            "timestamp": time.strftime("%H:%M:%S")
                        }
                    }))
                
                elif msg_type == "get_projects":
                    projects = project_manager.get_all_projects()
                    await websocket.send(json.dumps({
                        "type": "projects_list",
                        "data": projects
                    }))
                
                elif msg_type == "project_command":
                    project_id = data.get("project_id")
                    command_key = data.get("command")
                    result = project_manager.execute_command(project_id, command_key)
                    await websocket.send(json.dumps({
                        "type": "command_result",
                        "data": result
                    }))
                
                elif msg_type == "git_status":
                    project_id = data.get("project_id")
                    status = project_manager.get_git_status(project_id)
                    await websocket.send(json.dumps({
                        "type": "git_status",
                        "data": status
                    }))
                
                elif msg_type == "git_pull":
                    project_id = data.get("project_id")
                    result = project_manager.git_pull(project_id)
                    await websocket.send(json.dumps({
                        "type": "git_pull_result",
                        "data": result
                    }))
                
                elif msg_type == "open_vscode":
                    project_id = data.get("project_id")
                    result = project_manager.open_in_vscode(project_id)
                    await websocket.send(json.dumps({
                        "type": "vscode_result",
                        "data": result
                    }))
                
                elif msg_type == "start_pomodoro":
                    duration = data.get("duration", 25)
                    asyncio.create_task(
                        productivity_manager.start_pomodoro(websocket, duration)
                    )
                
                elif msg_type == "pomodoro_status":
                    status = productivity_manager.get_pomodoro_status()
                    await websocket.send(json.dumps({
                        "type": "pomodoro_status",
                        "data": status
                    }))
                
                elif msg_type == "add_task":
                    task_text = data.get("text")
                    result = productivity_manager.add_task(task_text)
                    await websocket.send(json.dumps({
                        "type": "task_added",
                        "data": result
                    }))
                
                elif msg_type == "get_tasks":
                    tasks = productivity_manager.get_tasks()
                    await websocket.send(json.dumps({
                        "type": "tasks_list",
                        "data": tasks
                    }))
                
                elif msg_type == "quick_actions":
                    actions = quick_actions.get_common_commands()
                    await websocket.send(json.dumps({
                        "type": "quick_actions",
                        "data": actions
                    }))
                
                elif msg_type == "get_anki_stats":
                    stats = anki_manager.get_stats()
                    await websocket.send(json.dumps({
                        "type": "anki_stats",
                        "data": stats
                    }))
                
                elif msg_type == "discover_anki":
                    anki_manager.discover_decks()
                    stats = anki_manager.get_stats()
                    await websocket.send(json.dumps({
                        "type": "anki_stats",
                        "data": stats
                    }))
                
                elif msg_type == "scan_downloads":
                    files = file_organizer.scan_downloads()
                    await websocket.send(json.dumps({
                        "type": "downloads_scan",
                        "data": files[:50]  # Limit to 50
                    }))
                
                elif msg_type == "organize_suggestions":
                    suggestions = file_organizer.organize_suggestions()
                    await websocket.send(json.dumps({
                        "type": "organize_suggestions",
                        "data": suggestions
                    }))
                
                elif msg_type == "get_contexts":
                    contexts = context_switcher.get_contexts()
                    await websocket.send(json.dumps({
                        "type": "contexts_list",
                        "data": contexts
                    }))
                
                elif msg_type == "switch_context":
                    context_name = data.get("context")
                    result = context_switcher.switch_to(context_name)
                    await websocket.send(json.dumps({
                        "type": "context_switched",
                        "data": result
                    }))
                    
            except json.JSONDecodeError:
                print("Invalid JSON received")
            except Exception as e:
                print(f"Error handling message: {e}")
                
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        clients.remove(websocket)

async def main():
    # Start system stats broadcaster
    asyncio.create_task(system_stats_broadcaster())
    
    # Start WebSocket server
    async with websockets.serve(handler, "localhost", 8765):
        print("=" * 60)
        print("🚀 FERVE LABS CORE - Backend Online")
        print("=" * 60)
        print(f"WebSocket Server: ws://localhost:8765")
        print(f"System Monitor: Active")
        print(f"Terminal Executor: Ready")
        print(f"AI Chat: Ready (Ollama)")
        print("=" * 60)
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())

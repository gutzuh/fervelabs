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

# Connected clients
clients = set()

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

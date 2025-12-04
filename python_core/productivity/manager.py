import asyncio
from datetime import datetime, timedelta

class ProductivityManager:
    def __init__(self):
        self.active_pomodoro = None
        self.pomodoro_count = 0
        self.tasks = []
    
    async def start_pomodoro(self, websocket, duration_minutes=25):
        """Start a Pomodoro timer"""
        if self.active_pomodoro:
            return {"success": False, "message": "Pomodoro already running"}
        
        self.active_pomodoro = {
            "start_time": datetime.now(),
            "duration": duration_minutes,
            "type": "work" if self.pomodoro_count % 2 == 0 else "break"
        }
        
        await websocket.send(json.dumps({
            "type": "pomodoro_started",
            "data": {
                "duration": duration_minutes,
                "type": self.active_pomodoro["type"]
            }
        }))
        
        # Wait for duration
        await asyncio.sleep(duration_minutes * 60)
        
        # Notify completion
        self.pomodoro_count += 1
        pomodoro_type = self.active_pomodoro["type"]
        self.active_pomodoro = None
        
        await websocket.send(json.dumps({
            "type": "pomodoro_complete",
            "data": {
                "type": pomodoro_type,
                "next": "break" if pomodoro_type == "work" else "work",
                "count": self.pomodoro_count
            }
        }))
        
        return {"success": True}
    
    def get_pomodoro_status(self):
        """Get current Pomodoro status"""
        if not self.active_pomodoro:
            return {"active": False, "count": self.pomodoro_count}
        
        elapsed = (datetime.now() - self.active_pomodoro["start_time"]).total_seconds() / 60
        remaining = self.active_pomodoro["duration"] - elapsed
        
        return {
            "active": True,
            "type": self.active_pomodoro["type"],
            "remaining_minutes": max(0, int(remaining)),
            "count": self.pomodoro_count
        }
    
    def add_task(self, task_text):
        """Add a task"""
        self.tasks.append({
            "id": len(self.tasks) + 1,
            "text": task_text,
            "completed": False,
            "created_at": datetime.now().isoformat()
        })
        return {"success": True, "task_id": len(self.tasks)}
    
    def toggle_task(self, task_id):
        """Toggle task completion"""
        for task in self.tasks:
            if task["id"] == task_id:
                task["completed"] = not task["completed"]
                return {"success": True}
        return {"success": False, "error": "Task not found"}
    
    def get_tasks(self):
        """Get all tasks"""
        return self.tasks

class QuickActions:
    @staticmethod
    def get_common_commands():
        """Get commonly used commands"""
        return {
            "git": {
                "status": "git status",
                "pull": "git pull",
                "push": "git push",
                "log": "git log --oneline -10",
                "branches": "git branch -a"
            },
            "docker": {
                "ps": "docker ps",
                "images": "docker images",
                "prune": "docker system prune -f",
                "stop_all": "docker stop $(docker ps -q)"
            },
            "system": {
                "ports": "lsof -i -P -n | grep LISTEN",
                "processes": "ps aux | head -20",
                "disk": "df -h",
                "memory": "free -h"
            },
            "node": {
                "version": "node --version && npm --version",
                "clean": "rm -rf node_modules package-lock.json",
                "outdated": "npm outdated"
            }
        }

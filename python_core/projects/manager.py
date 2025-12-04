import os
import subprocess
import json
from pathlib import Path

class ProjectManager:
    def __init__(self):
        self.projects_file = Path(__file__).parent / "projects.json"
        self.projects = self.load_projects()
    
    def load_projects(self):
        """Load projects from config or discover automatically"""
        default_projects = {
            "ferve-labs": {
                "name": "Ferve Labs - James Foundation",
                "path": "/home/isqne/Downloads/ferve-labs_-genesis-core",
                "type": "angular",
                "commands": {
                    "dev": "npm run dev -- --port 4300",
                    "build": "npm run build",
                    "install": "npm install --legacy-peer-deps"
                },
                "git_enabled": True,
                "favorite": True
            },
            "dashboard": {
                "name": "Dashboard 2",
                "path": "/home/isqne/Downloads/dashboard-2-main",
                "type": "fullstack",
                "commands": {
                    "backend": "cd backend && npm run dev",
                    "frontend": "cd frontend && npm run dev",
                    "install_all": "cd backend && npm install && cd ../frontend && npm install"
                },
                "git_enabled": True,
                "favorite": True
            }
        }
        
        if self.projects_file.exists():
            with open(self.projects_file, 'r') as f:
                return json.load(f)
        else:
            # Save default
            self.save_projects(default_projects)
            return default_projects
    
    def save_projects(self, projects):
        with open(self.projects_file, 'w') as f:
            json.dump(projects, f, indent=2)
    
    def get_all_projects(self):
        """Return all projects"""
        return self.projects
    
    def get_project(self, project_id):
        """Get specific project"""
        return self.projects.get(project_id)
    
    def execute_command(self, project_id, command_key):
        """Execute a project command"""
        project = self.get_project(project_id)
        if not project:
            return {"success": False, "error": "Project not found"}
        
        command = project["commands"].get(command_key)
        if not command:
            return {"success": False, "error": "Command not found"}
        
        try:
            # Execute in project directory
            result = subprocess.run(
                command,
                shell=True,
                cwd=project["path"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "exit_code": result.returncode
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Command timeout"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_git_status(self, project_id):
        """Get Git status for project"""
        project = self.get_project(project_id)
        if not project or not project.get("git_enabled"):
            return {"error": "Git not enabled"}
        
        try:
            # Get branch
            branch = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                cwd=project["path"],
                capture_output=True,
                text=True
            )
            
            # Get status
            status = subprocess.run(
                ["git", "status", "--short"],
                cwd=project["path"],
                capture_output=True,
                text=True
            )
            
            # Get last commit
            last_commit = subprocess.run(
                ["git", "log", "-1", "--pretty=%B"],
                cwd=project["path"],
                capture_output=True,
                text=True
            )
            
            return {
                "branch": branch.stdout.strip(),
                "changes": status.stdout.strip().split('\n') if status.stdout.strip() else [],
                "last_commit": last_commit.stdout.strip(),
                "has_changes": bool(status.stdout.strip())
            }
        except Exception as e:
            return {"error": str(e)}
    
    def git_pull(self, project_id):
        """Git pull for project"""
        project = self.get_project(project_id)
        if not project or not project.get("git_enabled"):
            return {"success": False, "error": "Git not enabled"}
        
        try:
            result = subprocess.run(
                ["git", "pull"],
                cwd=project["path"],
                capture_output=True,
                text=True
            )
            
            return {
                "success": result.returncode == 0,
                "output": result.stdout + result.stderr
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def open_in_vscode(self, project_id):
        """Open project in VS Code"""
        project = self.get_project(project_id)
        if not project:
            return {"success": False, "error": "Project not found"}
        
        try:
            subprocess.Popen(
                ["code", project["path"]],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            return {"success": True, "message": f"Opening {project['name']} in VS Code"}
        except Exception as e:
            return {"success": False, "error": str(e)}

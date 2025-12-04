import os
import sqlite3
import zipfile
from pathlib import Path
from datetime import datetime, timedelta
import tempfile

class AnkiManager:
    def __init__(self):
        self.downloads_path = Path("/home/isqne/Downloads")
        self.anki_decks = []
        self.discover_decks()
    
    def discover_decks(self):
        """Discover .apkg files in Downloads"""
        apkg_files = list(self.downloads_path.glob("*.apkg"))
        self.anki_decks = [
            {
                "name": f.stem.replace("_", " "),
                "path": str(f),
                "size": f.stat().st_size,
                "modified": datetime.fromtimestamp(f.stat().st_mtime).strftime("%d/%m/%Y")
            }
            for f in apkg_files
        ]
        return self.anki_decks
    
    def get_stats(self):
        """Get basic stats about Anki decks"""
        total_decks = len(self.anki_decks)
        total_size = sum(d['size'] for d in self.anki_decks)
        
        # Categorize by topic
        topics = {}
        for deck in self.anki_decks:
            name = deck['name']
            if any(x in name.lower() for x in ['anatomia', 'biology', 'química']):
                topic = "Ciências"
            elif any(x in name.lower() for x in ['legislação', 'constituição', 'educação']):
                topic = "Direito/Legislação"
            elif 'math' in name.lower():
                topic = "Matemática"
            else:
                topic = "Outros"
            
            topics[topic] = topics.get(topic, 0) + 1
        
        return {
            "total_decks": total_decks,
            "total_size_mb": round(total_size / 1024 / 1024, 2),
            "topics": topics,
            "decks": self.anki_decks
        }
    
    def open_anki(self):
        """Try to open Anki if installed"""
        try:
            import subprocess
            subprocess.Popen(['anki'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return {"success": True, "message": "Anki launched"}
        except:
            return {"success": False, "message": "Anki not found"}

class FileOrganizer:
    def __init__(self):
        self.downloads = Path("/home/isqne/Downloads")
        self.documents = Path("/home/isqne/Documents")
        self.desktop = Path("/home/isqne/Desktop")
    
    def scan_downloads(self):
        """Scan Downloads folder"""
        files = []
        
        for item in self.downloads.iterdir():
            if item.is_file():
                files.append({
                    "name": item.name,
                    "path": str(item),
                    "size": item.stat().st_size,
                    "modified": datetime.fromtimestamp(item.stat().st_mtime),
                    "type": self._get_file_type(item)
                })
        
        # Sort by modified date (newest first)
        files.sort(key=lambda x: x['modified'], reverse=True)
        
        return files
    
    def _get_file_type(self, path):
        """Get file type category"""
        suffix = path.suffix.lower()
        
        type_map = {
            'pdf': 'document',
            'doc': 'document',
            'docx': 'document',
            'txt': 'document',
            'jpg': 'image',
            'jpeg': 'image',
            'png': 'image',
            'webp': 'image',
            'apk': 'android',
            'apkg': 'anki',
            'zip': 'archive',
            'rar': 'archive',
            'tar': 'archive',
            'gz': 'archive'
        }
        
        return type_map.get(suffix[1:] if suffix else '', 'other')
    
    def organize_suggestions(self):
        """Suggest file organization"""
        files = self.scan_downloads()
        suggestions = {
            "pdfs_to_documents": [],
            "anki_cards": [],
            "apks": [],
            "old_files": [],  # >30 days
            "duplicates": []
        }
        
        now = datetime.now()
        
        for file in files:
            # PDFs to Documents
            if file['type'] == 'document' and not file['name'].startswith('.'):
                suggestions['pdfs_to_documents'].append(file)
            
            # Anki cards
            if file['type'] == 'anki':
                suggestions['anki_cards'].append(file)
            
            # APKs
            if file['type'] == 'android':
                suggestions['apks'].append(file)
            
            # Old files (>30 days)
            if (now - file['modified']).days > 30:
                suggestions['old_files'].append(file)
        
        return suggestions
    
    def auto_organize(self):
        """Automatically organize files"""
        results = {
            "moved": [],
            "cleaned": [],
            "errors": []
        }
        
        suggestions = self.organize_suggestions()
        
        # For safety, just return suggestions for now
        # User can approve each action
        
        return {
            "suggestions": suggestions,
            "message": "Review suggestions before organizing"
        }

class ContextSwitcher:
    """Manage different work contexts"""
    
    @staticmethod
    def get_contexts():
        return {
            "DEV": {
                "name": "Desenvolvimento",
                "icon": "💻",
                "apps": ["code", "brave-browser"],
                "description": "VS Code + Browser para desenvolvimento"
            },
            "STUDY": {
                "name": "Estudos",
                "icon": "📚",
                "apps": ["anki"],
                "description": "Anki para revisão de flashcards"
            },
            "FOCUS": {
                "name": "Foco Total",
                "icon": "🎯",
                "apps": [],
                "blocked_sites": ["youtube.com", "netflix.com", "twitter.com"],
                "description": "Bloqueia distrações + Pomodoro"
            }
        }
    
    @staticmethod
    def switch_to(context_name):
        """Switch to a context"""
        contexts = ContextSwitcher.get_contexts()
        context = contexts.get(context_name)
        
        if not context:
            return {"success": False, "error": "Context not found"}
        
        # For now, just return the context info
        # Full implementation would launch apps, block sites, etc.
        return {
            "success": True,
            "context": context_name,
            "message": f"Switched to {context['name']}",
            "apps_to_launch": context.get("apps", [])
        }

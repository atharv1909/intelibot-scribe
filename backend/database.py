import sqlite3
import json
import os
import tempfile
from typing import Any

if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
    DB_PATH = os.path.join(tempfile.gettempdir(), "intelibot.db")
else:
    DB_PATH = "intelibot.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    c = conn.cursor()
    
    # Projects
    c.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            title TEXT,
            prompt TEXT,
            mode TEXT,
            methodology_style TEXT,
            latex_template TEXT,
            stage INTEGER DEFAULT 1,
            status TEXT DEFAULT 'running',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Sources
    c.execute('''
        CREATE TABLE IF NOT EXISTS sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT,
            user_id TEXT,
            title TEXT,
            authors TEXT,
            venue TEXT,
            year INTEGER,
            url TEXT,
            doi TEXT,
            abstract TEXT,
            retrieval_method TEXT,
            relevance REAL,
            trust TEXT,
            injection_flag BOOLEAN,
            injection_detail TEXT,
            retrieved_at TIMESTAMP
        )
    ''')

    # Ideas
    c.execute('''
        CREATE TABLE IF NOT EXISTS ideas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT,
            user_id TEXT,
            kind TEXT,
            title TEXT,
            summary TEXT,
            rationale TEXT,
            feasibility TEXT,
            requires_lab BOOLEAN,
            source_ids TEXT, -- JSON
            selected BOOLEAN DEFAULT 0
        )
    ''')

    # Artifacts (Drafts, Pseudocode, Code, Paper)
    c.execute('''
        CREATE TABLE IF NOT EXISTS artifacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT,
            user_id TEXT,
            kind TEXT,
            version INTEGER,
            content TEXT,
            meta TEXT, -- JSON
            status TEXT DEFAULT 'pending',
            review_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Experiment Versions (Reruns)
    c.execute('''
        CREATE TABLE IF NOT EXISTS experiment_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT,
            user_id TEXT,
            version INTEGER,
            label TEXT,
            config TEXT, -- JSON
            metrics TEXT, -- JSON
            score REAL,
            verdict TEXT,
            architecture_change BOOLEAN,
            parent_version INTEGER,
            logs TEXT,
            rolled_back BOOLEAN DEFAULT 0,
            rollback_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Audit Logs
    c.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id TEXT,
            user_id TEXT,
            stage INTEGER,
            event TEXT,
            actor TEXT,
            severity TEXT,
            detail TEXT, -- JSON
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Memory
    c.execute('''
        CREATE TABLE IF NOT EXISTS memory_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            project_id TEXT,
            title TEXT,
            summary TEXT,
            lesson TEXT,
            weight REAL,
            expires_at TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()

# Initialize on import
init_db()

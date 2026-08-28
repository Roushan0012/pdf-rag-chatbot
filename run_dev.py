#!/usr/bin/env python3
"""
Full-Stack Dev Launcher: Runs Flask Backend (:5001) & React Frontend (:5173) concurrently.
"""
import os
import sys
import subprocess
import signal
import time
from pathlib import Path

root_dir = Path(__file__).resolve().parent
venv_python = root_dir / "venv" / "bin" / "python"
if not venv_python.exists():
    venv_python = Path(sys.executable)

processes = []

def cleanup(signum=None, frame=None):
    print("\n🛑 Shutting down servers...")
    for p in processes:
        if p.poll() is None:
            p.terminate()
            try:
                p.wait(timeout=3)
            except subprocess.TimeoutExpired:
                p.kill()
    print(" Servers stopped gracefully.")
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def main():
    print("=" * 60)
    print("🚀 Starting Enterprise PDF RAG Application...")
    print("=" * 60)
    
    # 1. Start Flask API Backend
    backend_script = root_dir / "backend" / "app.py"
    print(f"📦 Launching Backend API on http://127.0.0.1:5001 ...")
    backend_proc = subprocess.Popen(
        [str(venv_python), str(backend_script)],
        cwd=str(root_dir)
    )
    processes.append(backend_proc)

    time.sleep(1.5)

    # 2. Start Vite Frontend
    frontend_dir = root_dir / "frontend"
    print(f"✨ Launching React Frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(frontend_dir)
    )
    processes.append(frontend_proc)

    print("=" * 60)
    print(" Application is RUNNING!")
    print(" Backend API:  http://127.0.0.1:5001/api/health")
    print(" Frontend UI:  http://localhost:5173")
    print("=" * 60)
    print("Press Ctrl+C to stop both servers.\n")

    try:
        while True:
            time.sleep(1)
            for p in processes:
                if p.poll() is not None:
                    print(f"Process {p.pid} exited with code {p.returncode}. Stopping remaining processes...")
                    cleanup()
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()

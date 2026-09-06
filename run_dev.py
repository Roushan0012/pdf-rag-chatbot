#!/usr/bin/env python3
"""
Full-Stack Dev Launcher: Runs Flask Backend (:5001) & React Frontend (:5173) concurrently.
"""
import os
import sys
import subprocess
import signal
import time
import socket
from pathlib import Path

root_dir = Path(__file__).resolve().parent

# Use current Python interpreter (with all dependencies loaded)
venv_python = Path(sys.executable)

processes = []


def free_port(port: int):
    """Terminate any process holding the specified port."""
    try:
        out = subprocess.check_output(f"lsof -ti tcp:{port}", shell=True).decode().strip()
        if out:
            pids = out.split()
            current_pid = str(os.getpid())
            for pid in pids:
                if pid and pid != current_pid:
                    try:
                        os.kill(int(pid), signal.SIGKILL)
                        print(f"🧹 Freed port {port} (killed stale PID {pid})")
                    except Exception:
                        pass
            time.sleep(0.5)
    except Exception:
        pass


def cleanup(signum=None, frame=None):
    print("\n🛑 Shutting down servers gracefully...")
    for p in processes:
        if p.poll() is None:
            p.terminate()
            try:
                p.wait(timeout=3)
            except subprocess.TimeoutExpired:
                p.kill()
    print("✅ All servers stopped.")
    sys.exit(0)


signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)


def main():
    print("=" * 65)
    print("🚀 Starting Enterprise PDF RAG Application...")
    print("=" * 65)
    
    # Clean ports 5001 & 5173 before launching
    free_port(5001)
    free_port(5173)
    
    # 1. Start Flask API Backend
    backend_script = root_dir / "backend" / "app.py"
    print(f"📦 Launching Backend API on http://127.0.0.1:5001 ...")
    env = dict(os.environ)
    env["PYTHONUNBUFFERED"] = "1"
    
    backend_proc = subprocess.Popen(
        [str(venv_python), str(backend_script)],
        cwd=str(root_dir),
        env=env
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

    print("=" * 65)
    print("🌟 Enterprise PDF RAG Application is RUNNING!")
    print("👉 Frontend UI:  http://localhost:5173")
    print("👉 Backend API:  http://127.0.0.1:5001/api/health")
    print("=" * 65)
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

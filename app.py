"""
Root WSGI Entrypoint for Deployment (Vercel, Render, Gunicorn, etc.)
Imports and exposes the production Flask application from backend.app.
"""
import sys
from pathlib import Path

# Ensure root and backend directories are in sys.path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"

for p in [str(root_dir), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app import app

__all__ = ["app"]

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
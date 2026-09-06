import os
import sys
from pathlib import Path

# Add project root and backend directory to path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

for p in [str(root_dir), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app import app

# Expose app for WSGI / Vercel Serverless Function runtime
app = app

#!/usr/bin/env python3
"""Launcher for the Interactive Observability & Data Cleaning Dashboard (Team Nam).
Opens dashboard/index.html in the user's default browser or starts a lightweight local server.
"""
from __future__ import annotations

import http.server
from pathlib import Path
import socketserver
import threading
import time
import webbrowser


def main() -> None:
    root_dir = Path(__file__).resolve().parents[1]
    dashboard_dir = root_dir / "dashboard"
    index_file = dashboard_dir / "index.html"

    if not index_file.exists():
        print(f"Error: {index_file} not found.")
        return

    port = 8501
    handler = http.server.SimpleHTTPRequestHandler

    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(dashboard_dir), **kwargs)

        def log_message(self, format, *args):
            pass  # Suppress noisy request logs

    print("=" * 65)
    print("  ⚡ INTERACTIVE DATA OBSERVABILITY & CLEANING DASHBOARD")
    print("  Team: Nam (Nguyễn Trần Nhựt Nam) | K4-L3-DAY10")
    print("=" * 65)

    try:
        with socketserver.TCPServer(("", port), QuietHandler) as httpd:
            url = f"http://localhost:{port}/index.html"
            print(f"-> Starting Dashboard at: {url}")
            print("-> Press Ctrl+C in terminal to stop.")
            threading.Thread(target=lambda: (time.sleep(0.5), webbrowser.open(url)), daemon=True).start()
            httpd.serve_forever()
    except OSError:
        # Port already occupied, open file directly
        print(f"-> Port {port} in use. Opening file directly in browser...")
        webbrowser.open(f"file://{index_file.resolve()}")


if __name__ == "__main__":
    main()

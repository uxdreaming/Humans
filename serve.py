#!/usr/bin/env python3
"""Dev server for HUMANS with no-store cache headers (so updates are never stale).
Usage: python3 serve.py [port]   (default 8000)  ->  http://localhost:8000
"""
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # keep the terminal clean


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f'HUMANS dev server -> http://localhost:{port}')
    http.server.ThreadingHTTPServer(('0.0.0.0', port), NoCacheHandler).serve_forever()

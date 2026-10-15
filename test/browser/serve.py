#!/usr/bin/env python3
"""Tiny server for the browser remux harness.

Serves the repo (resolved from this file location), /media -> a directory
with the raw CMAF test streams, and accepts POST /save to capture the file.

Usage: python3 serve.py [media_dir] [out_path]
"""
import http.server
import os
import socketserver
import sys
import urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
MEDIA = sys.argv[1] if len(sys.argv) > 1 else "/tmp/rq-probe"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/rq-harness-out.mp4"


class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = urllib.parse.urlparse(path).path
        if p.startswith("/media/"):
            rel = os.path.relpath(urllib.parse.unquote(p), "/media")
            return os.path.join(MEDIA, rel)
        return super().translate_path(path)

    def do_POST(self):
        if urllib.parse.urlparse(self.path).path != "/save":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length") or 0)
        n = 0
        with open(OUT, "wb") as f:
            remaining = length
            while remaining > 0:
                chunk = self.rfile.read(min(1 << 16, remaining))
                if not chunk:
                    break
                f.write(chunk)
                n += len(chunk)
                remaining -= len(chunk)
        self.send_response(200)
        self.send_header("Content-Length", "2")
        self.end_headers()
        self.wfile.write(b"ok")
        print("saved %d bytes -> %s" % (n, OUT), file=sys.stderr)

    def log_message(self, *a):
        pass


os.chdir(REPO)
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", 8931), H) as s:
    print("serving repo=%s media=%s on 127.0.0.1:8931" % (REPO, MEDIA), file=sys.stderr)
    s.serve_forever()

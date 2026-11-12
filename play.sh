#!/usr/bin/env bash
# HUMANS launcher — double-click to play, no terminal needed.
# Starts the dev server in the background (killing stale ones) and opens
# the game in the default browser. Logs to /tmp/humans-launch.log.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
PORT=8000
LOG=/tmp/humans-launch.log
URL="http://localhost:${PORT}/?v=0.5.0"

{
  echo "== $(date '+%H:%M:%S') lanzando desde $DIR =="

  page_ok() {
    python3 - "$PORT" <<'PY' 2>/dev/null
import sys, urllib.request
try:
    html = urllib.request.urlopen(f"http://localhost:{sys.argv[1]}/", timeout=2).read().decode()
    print("v=0.5.0" in html)
except Exception:
    print("False")
PY
  }

  if [ "$(page_ok)" = "True" ]; then
    echo "servidor ya corriendo y sirviendo v0.4.0 -> reutilizo"
  else
    echo "mato servidores viejos (si hay)..."
    pkill -f "serve.py" 2>/dev/null
    pkill -f "http.server" 2>/dev/null
    sleep 1
    nohup python3 serve.py "$PORT" >>/tmp/humans-server.log 2>&1 &
    echo "servidor nuevo pid $!"
    for i in 1 2 3 4 5 6; do
      sleep 1
      if [ "$(page_ok)" = "True" ]; then echo "servidor OK tras ${i}s"; break; fi
    done
    if [ "$(page_ok)" != "True" ]; then echo "ERROR: el servidor no responde con v0.4.0"; fi
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" && echo "navegador abierto con xdg-open"
  elif command -v firefox >/dev/null 2>&1; then
    firefox "$URL" & echo "navegador abierto con firefox"
  elif command -v chromium >/dev/null 2>&1; then
    chromium "$URL" & echo "navegador abierto con chromium"
  elif command -v google-chrome >/dev/null 2>&1; then
    google-chrome "$URL" & echo "navegador abierto con chrome"
  else
    echo "ERROR: no encontre xdg-open ni navegador"
  fi
} >>"$LOG" 2>&1

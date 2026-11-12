#!/usr/bin/env bash
# HUMANS launcher — double-click to play, no terminal needed.
# Starts the dev server in the background (if not already running) and
# opens the game in the default browser.
set -u
cd "$(dirname "$0")"
PORT=8000

if curl -s -o /dev/null "http://localhost:${PORT}/"; then
  : # server already running, reuse it
else
  nohup python3 serve.py "${PORT}" >/tmp/humans-server.log 2>&1 &
  sleep 1
fi

xdg-open "http://localhost:${PORT}/?v=0.4.0"

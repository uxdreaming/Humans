#!/usr/bin/env bash
# Stops the HUMANS dev server (started by play.sh).
if pkill -f "serve.py"; then
  echo "HUMANS: servidor detenido."
else
  echo "HUMANS: no hay servidor corriendo."
fi

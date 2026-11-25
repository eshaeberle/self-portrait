#!/bin/bash
# Double-click to preview the site on this Mac.
# The 3D lab needs to be served over http (browsers block it when index.html is opened as a file),
# so this starts a small local server and opens the page. Close this window to stop it.
cd "$(dirname "$0")"
PORT=8000
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT+1)); done
echo "Serving the Visual Self Portrait at http://localhost:$PORT  (close this window to stop)"
( sleep 1; open "http://localhost:$PORT/" ) &
python3 -m http.server $PORT

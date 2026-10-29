#!/usr/bin/env bash
# Renders and encodes episodes in order: ./render_queue.sh <frames_root> 2h 3h 4v ...
# Each item is <episode><h|v>; output goes to out/seriyaN_16x9.mp4 or out/seriyaN_9x16.mp4.
set -u
cd "$(dirname "$0")"
root="$1"; shift
for item in "$@"; do
  ep="${item%?}"; f="${item: -1}"; name=$([ "$f" = h ] && echo 16x9 || echo 9x16)
  dir="$root/ep${ep}_$f"
  PAGE="episode.html?ep=$ep&fmt=$f" NODE_PATH="$(npm root -g)" node render.cjs "$dir" 4 30 || { echo "FAILED $item"; exit 1; }
  ffmpeg -y -loglevel error -framerate 30 -i "$dir/f%05d.jpg" -i "episodes/ep$ep.wav" -c:v libx264 -preset medium -crf 24 \
    -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "out/seriya${ep}_$name.mp4" && echo "ENCODED $item" && rm -rf "${dir:?}"
done
echo "QUEUE DONE"

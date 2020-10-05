#!/bin/bash
_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export MIGMETA_FILE="$_dir/../tmp/migmeta.json"
# export VIEWS_DIR="$_dir/../public"
export STATIC_DIR="$_dir/../dist"
export NODE_TLS_REJECT_UNAUTHORIZED="0"
mkdir -p "$STATIC_DIR"
cd $_dir/..
if [ "$1" == "--auto-reload" ]; then
  # node node_modules/nodemon/bin/nodemon.js server.js
  node $_dir/../node_modules/nodemon/bin/nodemon.js --inspect --watch $_dir/../deploy $_dir/../deploy/server.js
else
  node $_dir/../deploy/server.js --inspect
fi

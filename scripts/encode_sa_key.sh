#!/usr/bin/env bash
# Helper: encode a JSON service account key to base64 for use in .env
# Usage: ./scripts/encode_sa_key.sh /path/to/key.json

set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /path/to/key.json"
  exit 1
fi
KEYFILE="$1"
if [ ! -f "$KEYFILE" ]; then
  echo "File not found: $KEYFILE"
  exit 2
fi
base64 -i "$KEYFILE"

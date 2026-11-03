#!/bin/bash
# BlasterZone IPA wrapper
# Usage: ./wrap_ipa.sh [path/to/build.tar.gz]
# If no arg given, downloads latest EAS build automatically

set -e

OUTDIR="/home/claude"
IPA_NAME="BlasterZone.ipa"

if [ -n "$1" ]; then
  TARG="$1"
  echo "Using provided tar.gz: $TARG"
else
  echo "Fetching latest EAS build URL..."
  BUILD_URL=$(npx eas-cli build:list --platform ios --status finished --limit 1 --json 2>/dev/null | \
    python3 -c "import sys,json; builds=json.load(sys.stdin); print(builds[0]['artifacts']['buildUrl'])" 2>/dev/null || true)

  if [ -z "$BUILD_URL" ]; then
    echo "Could not auto-fetch build URL."
    echo "Go to https://expo.dev — find the latest build — download the tar.gz — run:"
    echo "  ./wrap_ipa.sh /path/to/build.tar.gz"
    exit 1
  fi

  echo "Downloading: $BUILD_URL"
  TARG="/tmp/blasterzone_build.tar.gz"
  curl -L "$BUILD_URL" -o "$TARG"
fi

echo "Extracting..."
WORKDIR=$(mktemp -d)
tar -xzf "$TARG" -C "$WORKDIR"

# Find the .app bundle
APP_PATH=$(find "$WORKDIR" -name "*.app" -maxdepth 5 | head -1)
if [ -z "$APP_PATH" ]; then
  echo "ERROR: No .app found in tar.gz"
  echo "Contents:"
  find "$WORKDIR" | head -30
  exit 1
fi

echo "Found .app: $APP_PATH"

# Build Payload structure
PAYLOAD_DIR="$WORKDIR/Payload"
mkdir -p "$PAYLOAD_DIR"
cp -r "$APP_PATH" "$PAYLOAD_DIR/"

APP_BASENAME=$(basename "$APP_PATH")
echo "Bundling Payload/$APP_BASENAME → $IPA_NAME"

cd "$WORKDIR"
zip -r -q "$OUTDIR/$IPA_NAME" Payload/

echo ""
echo "✅ Done: $OUTDIR/$IPA_NAME"
ls -lh "$OUTDIR/$IPA_NAME"

rm -rf "$WORKDIR"

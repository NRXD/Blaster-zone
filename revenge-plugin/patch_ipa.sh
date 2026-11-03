#!/bin/bash
# BlasterZone IPA Patcher
# Takes Revenge.ipa, injects BlasterZone plugin, outputs BlasterZone.ipa

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT_IPA="${1:-/tmp/Revenge.ipa}"
OUTPUT_IPA="${2:-/home/claude/BlasterZone.ipa}"
PLUGIN_SRC="$SCRIPT_DIR/src/index.js"

echo "=== BlasterZone IPA Patcher ==="
echo "Input:  $INPUT_IPA"
echo "Output: $OUTPUT_IPA"

# Extract IPA
WORK=$(mktemp -d)
echo "Extracting..."
unzip -q "$INPUT_IPA" -d "$WORK"

APP_PATH="$WORK/Payload/Discord.app"
PATCHES_BUNDLE="$APP_PATH/RevengePatches.bundle"

if [ ! -d "$PATCHES_BUNDLE" ]; then
  echo "ERROR: RevengePatches.bundle not found — is this the Revenge IPA?"
  exit 1
fi

# Read current payload-base.js
PAYLOAD_BASE="$PATCHES_BUNDLE/payload-base.js"
echo "Patching payload-base.js..."

# The RevengeTweak dylib has built-in preloads support:
# "Executing preload JS file" — it reads every .js from RevengePatches.bundle/preloads/
# BlasterZone goes there — no payload-base.js modification needed

PRELOADS="$PATCHES_BUNDLE/preloads"
mkdir -p "$PRELOADS"
cp "$PLUGIN_SRC" "$PRELOADS/blasterzone.js"
echo "Added BlasterZone to RevengePatches.bundle/preloads/"

# Repack IPA
echo "Repacking IPA..."
cd "$WORK"
zip -r -q "$OUTPUT_IPA" Payload/

ls -lh "$OUTPUT_IPA"
echo ""
echo "✅ Done: $OUTPUT_IPA"
echo "Sign with KSign and sideload"

rm -rf "$WORK"

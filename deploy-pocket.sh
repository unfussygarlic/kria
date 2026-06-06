#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# deploy-pocket.sh — Build and submit Kria Pocket to Google Play (internal track)
#
# Usage:
#   ./deploy-pocket.sh             # build + open EAS dashboard to download AAB
#   ./deploy-pocket.sh --submit    # build + auto-submit to Play Store (needs google-services-key.json)
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POCKET_DIR="$SCRIPT_DIR/frontend/pocket"
SUBMIT=false

for arg in "$@"; do
  case $arg in
    --submit) SUBMIT=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

echo ""
echo "┌─────────────────────────────────────────┐"
echo "│  Kria Pocket — EAS Production Build      │"
echo "└─────────────────────────────────────────┘"
echo ""

# ── Check EAS login ──────────────────────────────────────────────────────────
echo "▸ Checking EAS login..."
EAS_USER=$(eas whoami 2>/dev/null | grep "@" || true)
if [[ -z "$EAS_USER" ]]; then
  echo "  ✗ Not logged in to EAS. Run: eas login"
  exit 1
fi
echo "  ✓ Logged in as $EAS_USER"

# ── Navigate to pocket app ───────────────────────────────────────────────────
cd "$POCKET_DIR"

# ── Build ────────────────────────────────────────────────────────────────────
echo ""
echo "▸ Starting EAS production build (Android AAB)..."
echo "  This runs in the cloud — takes ~10–15 min."
echo ""

eas build \
  --platform android \
  --profile production \
  --non-interactive

echo ""
echo "┌─────────────────────────────────────────┐"
echo "│  ✓ Build complete!                        │"
echo "└─────────────────────────────────────────┘"

# ── Submit (optional) ────────────────────────────────────────────────────────
if [[ "$SUBMIT" == true ]]; then
  echo ""
  echo "▸ Submitting to Play Store (internal track)..."

  KEY_PATH="$POCKET_DIR/google-services-key.json"
  if [[ ! -f "$KEY_PATH" ]]; then
    echo "  ✗ google-services-key.json not found at $KEY_PATH"
    echo "    Download it from Google Cloud → IAM → Service Accounts"
    echo "    and save it as frontend/pocket/google-services-key.json"
    exit 1
  fi

  eas submit \
    --platform android \
    --profile production \
    --latest \
    --non-interactive

  echo ""
  echo "  ✓ Submitted to Play Store internal track."
  echo "    Check: https://play.google.com/console"
else
  echo ""
  echo "  To upload: Play Console → com.kria.pocket → Testing → Internal testing"
  echo "             → Create new release → upload the AAB above"
  echo ""
  echo "  To auto-submit next time, run:  ./deploy-pocket.sh --submit"
  echo "  (requires frontend/pocket/google-services-key.json)"
fi

echo ""

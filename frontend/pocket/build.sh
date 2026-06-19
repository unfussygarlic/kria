#!/usr/bin/env bash
# build.sh — Local Kria Pocket build + optional Play Store submit
# Usage: ./build.sh

set -euo pipefail

# ── Colours ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}▶ $*${RESET}"; }
success() { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()   { echo -e "${RED}✗ $*${RESET}"; exit 1; }
header()  { echo -e "\n${BOLD}$*${RESET}"; }

# ── Resolve script dir so it works from anywhere ───────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Prerequisites ──────────────────────────────────────────────────────────────
header "Checking prerequisites..."

command -v node >/dev/null 2>&1 || error "node not found"
command -v eas  >/dev/null 2>&1 || error "eas-cli not found — run: npm install -g eas-cli"

[[ -n "${ANDROID_HOME:-}" ]] || error "ANDROID_HOME is not set"
[[ -d "$ANDROID_HOME" ]]     || error "ANDROID_HOME=$ANDROID_HOME does not exist"

# react-native-reanimated requires exactly Java 17 via Gradle toolchain.
# Detect it and force JAVA_HOME so Gradle doesn't pick up Java 21.
JAVA17_HOME=""
for candidate in \
    /usr/lib/jvm/java-17-openjdk-amd64 \
    /usr/lib/jvm/java-17-openjdk \
    /usr/lib/jvm/temurin-17 \
    /usr/local/lib/jvm/java-17; do
  if [[ -x "$candidate/bin/javac" ]]; then
    JAVA17_HOME="$candidate"
    break
  fi
done

if [[ -z "$JAVA17_HOME" ]]; then
  error "Java 17 JDK not found. Fix:\n  sudo apt install openjdk-17-jdk"
fi

export JAVA_HOME="$JAVA17_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

success "Node $(node --version) / EAS $(eas --version 2>/dev/null | head -1) / Java $(java -version 2>&1 | head -1)"
info "JAVA_HOME=$JAVA_HOME"

# ── EAS login check ────────────────────────────────────────────────────────────
header "Checking EAS login..."
EAS_USER=$(eas whoami 2>/dev/null || true)
if [[ -z "$EAS_USER" ]]; then
  warn "Not logged in to EAS. Running eas login..."
  eas login
  EAS_USER=$(eas whoami 2>/dev/null)
fi
success "Logged in as: $EAS_USER"

# ── Profile selection ──────────────────────────────────────────────────────────
header "Select build profile:"
echo "  1) preview    — APK, sideload directly to device (fast testing)"
echo "  2) production — AAB, upload to Play Store"
echo ""
read -rp "Choice [1/2]: " PROFILE_CHOICE

case "$PROFILE_CHOICE" in
  1) PROFILE="preview";    ARTIFACT="APK" ;;
  2) PROFILE="production"; ARTIFACT="AAB" ;;
  *) error "Invalid choice" ;;
esac

success "Profile: $PROFILE ($ARTIFACT)"

# ── Build ──────────────────────────────────────────────────────────────────────
header "Building $ARTIFACT locally (this takes ~5–10 min)..."
echo ""

BUILD_START=$(date +%s)

eas build --local --platform android --profile "$PROFILE" --non-interactive

BUILD_END=$(date +%s)
ELAPSED=$(( BUILD_END - BUILD_START ))
ELAPSED_MIN=$(( ELAPSED / 60 ))
ELAPSED_SEC=$(( ELAPSED % 60 ))

echo ""
success "Build completed in ${ELAPSED_MIN}m ${ELAPSED_SEC}s"

# ── Find the output artifact ───────────────────────────────────────────────────
if [[ "$ARTIFACT" == "APK" ]]; then
  ARTIFACT_FILE=$(find "$SCRIPT_DIR" -maxdepth 2 -name "*.apk" -newer "$SCRIPT_DIR/package.json" 2>/dev/null | sort -t_ -k1 | tail -1)
else
  ARTIFACT_FILE=$(find "$SCRIPT_DIR" -maxdepth 2 -name "*.aab" -newer "$SCRIPT_DIR/package.json" 2>/dev/null | sort -t_ -k1 | tail -1)
fi

if [[ -n "$ARTIFACT_FILE" ]]; then
  success "Artifact: $ARTIFACT_FILE"
  SIZE=$(du -sh "$ARTIFACT_FILE" | cut -f1)
  info "Size: $SIZE"
else
  warn "Could not locate output file automatically — check the eas build output above"
fi

# ── Sideload (preview only) ────────────────────────────────────────────────────
if [[ "$PROFILE" == "preview" && -n "$ARTIFACT_FILE" ]]; then
  echo ""
  header "Install to connected device?"
  read -rp "Run adb install? [y/N]: " ADB_CHOICE
  if [[ "${ADB_CHOICE,,}" == "y" ]]; then
    DEVICES=$(adb devices | grep -v "List of devices" | grep "device$" | wc -l)
    if [[ "$DEVICES" -eq 0 ]]; then
      warn "No ADB device connected — install the APK manually"
    else
      info "Installing $ARTIFACT_FILE..."
      adb install -r "$ARTIFACT_FILE"
      success "Installed on device"
    fi
  fi
fi

# ── Submit to Play Store (production only) ─────────────────────────────────────
if [[ "$PROFILE" == "production" ]]; then
  echo ""
  header "Submit to Play Store?"
  echo "  Track configured: internal (see eas.json)"
  echo ""
  read -rp "Submit now? [y/N]: " SUBMIT_CHOICE

  if [[ "${SUBMIT_CHOICE,,}" == "y" ]]; then
    [[ -f "$SCRIPT_DIR/google-services-key.json" ]] || \
      error "google-services-key.json not found — required for Play Store submission"

    if [[ -n "$ARTIFACT_FILE" ]]; then
      info "Submitting $ARTIFACT_FILE..."
      eas submit --platform android --profile production --path "$ARTIFACT_FILE" --non-interactive
      success "Submitted to Play Store internal track"
    else
      warn "No AAB path found — running eas submit without --path (will use latest EAS build)"
      eas submit --platform android --profile production --non-interactive
    fi
  else
    info "Skipping submission. Upload manually at: https://play.google.com/console"
    [[ -n "$ARTIFACT_FILE" ]] && info "AAB file: $ARTIFACT_FILE"
  fi
fi

echo ""
success "Done."

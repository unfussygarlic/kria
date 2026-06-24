#!/usr/bin/env bash
# setup-android.sh — Minimal Android SDK setup for Kria Pocket local builds
# Safe to re-run: skips steps that are already done.

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}▶ $*${RESET}"; }
success() { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()   { echo -e "${RED}✗ $*${RESET}"; exit 1; }
header()  { echo -e "\n${BOLD}═══ $* ═══${RESET}"; }

# ── Config ────────────────────────────────────────────────────────────────────
ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
CMDLINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-14742923_latest.zip"
CMDLINE_TOOLS_DIR="$ANDROID_HOME/cmdline-tools/latest"
SDKMANAGER="$CMDLINE_TOOLS_DIR/bin/sdkmanager"

# Exact versions from libs.versions.toml
PLATFORM="platforms;android-36"
BUILD_TOOLS="build-tools;36.0.0"
NDK="ndk;27.1.12297006"

header "Android SDK Setup"
echo "  ANDROID_HOME = $ANDROID_HOME"
echo ""

# ── Disk check (need ~1 GB minimum without NDK) ───────────────────────────────
AVAIL_MB=$(df -m "$HOME" | awk 'NR==2 {print $4}')
if [[ "$AVAIL_MB" -lt 1200 ]]; then
  error "Only ${AVAIL_MB}MB free — need at least 1.2 GB. Free up space first."
fi
info "Disk available: ${AVAIL_MB}MB"

# ── Java 17 check ─────────────────────────────────────────────────────────────
header "Java 17"
JAVA17=""
for candidate in \
    /usr/lib/jvm/java-17-openjdk-amd64 \
    /usr/lib/jvm/java-17-openjdk \
    /usr/lib/jvm/temurin-17; do
  if [[ -x "$candidate/bin/javac" ]]; then
    JAVA17="$candidate"; break
  fi
done

if [[ -z "$JAVA17" ]]; then
  info "Java 17 not found — installing..."
  sudo apt-get install -y openjdk-17-jdk-headless
  for candidate in /usr/lib/jvm/java-17-openjdk-amd64 /usr/lib/jvm/java-17-openjdk; do
    [[ -x "$candidate/bin/javac" ]] && JAVA17="$candidate" && break
  done
  [[ -z "$JAVA17" ]] && error "Java 17 install failed"
fi
success "Java 17 at $JAVA17"

# ── Download cmdline-tools ─────────────────────────────────────────────────────
header "Command-line tools"
if [[ -f "$SDKMANAGER" ]]; then
  success "Already installed — skipping download"
else
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  TMP_ZIP=$(mktemp /tmp/cmdline-tools-XXXXXX.zip)
  info "Downloading cmdline-tools (~130 MB)..."
  curl -# -L "$CMDLINE_TOOLS_URL" -o "$TMP_ZIP"
  info "Extracting..."
  TMP_DIR=$(mktemp -d)
  unzip -q "$TMP_ZIP" -d "$TMP_DIR"
  # Google zips to cmdline-tools/ — rename to latest/ per SDK layout spec
  mv "$TMP_DIR/cmdline-tools" "$CMDLINE_TOOLS_DIR"
  rm -rf "$TMP_ZIP" "$TMP_DIR"
  success "Installed at $CMDLINE_TOOLS_DIR"
fi

# ── Accept licenses ───────────────────────────────────────────────────────────
header "SDK licenses"
yes | "$SDKMANAGER" --licenses > /dev/null 2>&1 && success "Licenses accepted" || warn "Some licenses may need manual review"

# ── Install minimal SDK packages ──────────────────────────────────────────────
header "SDK packages (platform-tools + android-36 + build-tools 36)"
info "Approximate download: ~400 MB"

"$SDKMANAGER" --install \
  "platform-tools" \
  "$PLATFORM" \
  "$BUILD_TOOLS" \
  2>&1 | grep -v "^$\|Unzipping\|Preparing\|\[=\|done$" || true

success "Core SDK packages installed"

# ── NDK (optional — required for native C++ modules) ──────────────────────────
header "NDK 27.1.12297006"
NDK_DIR="$ANDROID_HOME/ndk/27.1.12297006"
if [[ -d "$NDK_DIR" ]]; then
  success "NDK already installed — skipping"
else
  AVAIL_NOW=$(df -m "$HOME" | awk 'NR==2 {print $4}')
  echo ""
  warn "NDK is ~1.2 GB. You have ${AVAIL_NOW}MB free."
  read -rp "  Install NDK? Required only if you have native C++ modules [y/N]: " NDK_CHOICE
  if [[ "${NDK_CHOICE,,}" == "y" ]]; then
    "$SDKMANAGER" --install "$NDK" 2>&1 | grep -v "^$\|Unzipping\|Preparing\|\[=" || true
    success "NDK installed"
  else
    warn "Skipped NDK — build may fail if native modules require it"
  fi
fi

# ── Environment variables ─────────────────────────────────────────────────────
header "Environment variables"

add_to_shell() {
  local FILE="$1"
  [[ -f "$FILE" ]] || return

  if grep -q "ANDROID_HOME" "$FILE"; then
    success "$FILE already has ANDROID_HOME — skipping"
  else
    cat >> "$FILE" <<EOF

# Android SDK
export ANDROID_HOME=$ANDROID_HOME
export PATH=\$PATH:\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools
EOF
    success "Added to $FILE"
  fi
}

add_to_shell "$HOME/.bashrc"
add_to_shell "$HOME/.zshrc"

# Also export for the current session so build.sh works immediately
export ANDROID_HOME
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools"

# ── Verify ────────────────────────────────────────────────────────────────────
header "Verification"
echo "  ANDROID_HOME : $ANDROID_HOME"
echo "  sdkmanager   : $("$SDKMANAGER" --version 2>/dev/null || echo 'not found')"
echo "  adb          : $(adb --version 2>/dev/null | head -1 || echo 'not in PATH yet — restart shell')"
echo ""
"$SDKMANAGER" --list_installed 2>/dev/null | grep -E "platform-tools|platforms;|build-tools;|ndk;" || true

echo ""
success "Setup complete. Run: source ~/.bashrc && ./build.sh"

#!/usr/bin/env bash
# Builds "Tree Tracker.app" (like FocusFrog: a launcher that starts a small local
# server and opens the app in your browser), installs it in
# ~/Applications and pins it to the Dock. Re-run after changing the code.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$HOME/Applications/Tree Tracker.app"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
BUNDLE="$WORK/Tree Tracker.app"
RES="$BUNDLE/Contents/Resources"

mkdir -p "$BUNDLE/Contents/MacOS" "$RES/app"
cp -R "$ROOT"/{index.html,manifest.webmanifest,sw.js,css,js,assets} "$RES/app/"
rm -f "$RES/app/assets/tree-tracker-logo.png" # source artwork, the app uses logo.webp
cp "$ROOT/scripts/serve.mjs" "$RES/"
date +%s > "$RES/build-id"

ICONSET="$WORK/TreeTracker.iconset"
mkdir -p "$ICONSET"
for size in 16 32 128 256 512; do
  sips -z $size $size "$ROOT/assets/icons/macos-icon-1024.png" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
  sips -z $((size * 2)) $((size * 2)) "$ROOT/assets/icons/macos-icon-1024.png" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$RES/TreeTracker.icns"

cat > "$BUNDLE/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Tree Tracker</string>
  <key>CFBundleDisplayName</key><string>Tree Tracker</string>
  <key>CFBundleIdentifier</key><string>dev.treetracker.TreeTracker</string>
  <key>CFBundleExecutable</key><string>TreeTracker</string>
  <key>CFBundleIconFile</key><string>TreeTracker</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>10.15</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

cat > "$BUNDLE/Contents/MacOS/TreeTracker" <<'LAUNCHER'
#!/usr/bin/env bash
set -euo pipefail
RES="$(cd "$(dirname "${BASH_SOURCE[0]}")/../Resources" && pwd)"
BUILD="$(cat "$RES/build-id")"
PORT=27190
URL="http://127.0.0.1:$PORT/"
LOG="${TMPDIR:-/tmp}/tree-tracker-server.log"
# Apps opened from the Dock don't get the shell's PATH.
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/miniconda3/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

alert() {
  /usr/bin/osascript -e "display dialog \"$1\" buttons {\"OK\"} default button \"OK\" with title \"Tree Tracker\"" >/dev/null 2>&1 || true
}
health() { /usr/bin/curl -fsS --max-time 1 "${URL}healthz" 2>/dev/null || true; }
current() { [[ "$(health)" == *"\"build\":\"$BUILD\""* ]]; }

if ! current; then
  # A server left over from an older build of this app: stop it first.
  old_pid="$(health | sed -n 's/.*"pid":\([0-9]*\).*/\1/p')"
  if [[ -n "$old_pid" ]]; then
    kill "$old_pid" 2>/dev/null || true
    for _ in {1..20}; do [[ -z "$(health)" ]] && break; sleep 0.1; done
  fi
  if ! command -v node >/dev/null 2>&1; then
    alert "Tree Tracker needs Node.js, which was not found."
    exit 1
  fi
  nohup node "$RES/serve.mjs" "$RES/app" "$PORT" "$BUILD" >>"$LOG" 2>&1 &
  disown
  for _ in {1..30}; do current && break; sleep 0.2; done
  if ! current; then
    alert "Tree Tracker could not start (is port $PORT in use?). Details: $LOG"
    exit 1
  fi
fi

/usr/bin/open "$URL"
LAUNCHER
chmod +x "$BUNDLE/Contents/MacOS/TreeTracker"

mkdir -p "$HOME/Applications"
rm -rf "$APP"
/usr/bin/ditto "$BUNDLE" "$APP"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP" >/dev/null 2>&1 || true

APP_URL="file://${APP// /%20}/"
if /usr/bin/defaults read com.apple.dock persistent-apps 2>/dev/null | grep -q "$APP_URL"; then
  echo "Tree Tracker is already in the Dock."
else
  /usr/bin/defaults write com.apple.dock persistent-apps -array-add "<dict>
  <key>tile-data</key><dict>
    <key>file-data</key><dict>
      <key>_CFURLString</key><string>$APP_URL</string>
      <key>_CFURLStringType</key><integer>15</integer>
    </dict>
    <key>file-label</key><string>Tree Tracker</string>
  </dict>
  <key>tile-type</key><string>file-tile</string>
</dict>"
  /usr/bin/killall Dock
  echo "Added Tree Tracker to the Dock."
fi
echo "Installed $APP"

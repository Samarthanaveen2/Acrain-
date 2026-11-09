#!/bin/bash
# Builds QuickNote.app (universal: Intel + Apple Silicon, macOS 12+) and zips it.
set -euo pipefail
cd "$(dirname "$0")"

APP="build/QuickNote.app"
rm -rf build
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
SDK="$(xcrun --sdk macosx --show-sdk-path)"

for ARCH in x86_64 arm64; do
  swiftc -O -swift-version 5 -sdk "$SDK" -target "$ARCH-apple-macos12.0" \
    Sources/*.swift -o "build/QuickNote-$ARCH" \
    -framework AppKit -framework Carbon
done
lipo -create build/QuickNote-x86_64 build/QuickNote-arm64 -output "$APP/Contents/MacOS/QuickNote"
cp Info.plist "$APP/Contents/Info.plist"

# App icon (optional: the app still works if this step fails)
if swift Scripts/make_icon.swift build/AppIcon.iconset && iconutil -c icns build/AppIcon.iconset -o "$APP/Contents/Resources/AppIcon.icns"; then
  echo "Icon generated"
else
  echo "warning: icon generation failed, continuing without icon"
fi

codesign --force --deep --sign - "$APP"
lipo -info "$APP/Contents/MacOS/QuickNote"
otool -L "$APP/Contents/MacOS/QuickNote"
ditto -c -k --keepParent "$APP" build/QuickNote.zip
echo "Built build/QuickNote.zip"

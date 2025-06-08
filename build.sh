#!/bin/bash

# Build script for LinkedIn Self-Centered Post Detector browser extension

# Display a colorful banner
echo -e "\033[1;34m"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   LinkedIn Self-Centered Post Detector - Build Script         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "\033[0m"

# Check for dependencies
echo "Checking dependencies..."
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js and try again."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "npm is not installed. Please install npm and try again."
    exit 1
fi

echo "Installing dependencies..."
npm install

# SKIP ICON CONVERSION IF IT FAILS
echo "Converting SVG icons to PNG (if possible)..."
for size in 16 48 128; do
  if [ -f "icons/icon${size}.svg" ]; then
    npx svgexport "icons/icon${size}.svg" "icons/icon${size}.png" "${size}:${size}" || echo "[WARN] svgexport failed for icon${size}.svg, skipping."
  else
    echo "[WARN] icons/icon${size}.svg not found, skipping."
  fi
done

# Remove old package if it exists to avoid UsageError
PACKAGE_PATH="web-ext-artifacts/linkedin_self-centered_post_detector-1.1.0.zip"
if [ -f "$PACKAGE_PATH" ]; then
  echo "Removing old package: $PACKAGE_PATH"
  rm "$PACKAGE_PATH"
fi

echo "Building extension..."
npm run build

# Check if the build was successful
if [ ! -f "dist/content.js" ]; then
    echo -e "\033[1;31mBuild failed! The dist/content.js file was not created.\033[0m"
    exit 1
fi

echo "Packaging extension..."
npm run package

echo -e "\033[1;32m"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   Build complete! The packaged extension is in:               ║"
echo "║   ./web-ext-artifacts/                                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "\033[0m"

# Instructions
echo "To install the extension in your browser:"
echo "1. Chrome: Go to chrome://extensions/, enable 'Developer mode', click 'Load unpacked', and select the 'dist' folder."
echo "2. Firefox: Go to about:debugging#/runtime/this-firefox, click 'Load Temporary Add-on...', and select any file in the 'dist' folder."
echo "3. Edge: Go to edge://extensions/, enable 'Developer mode', click 'Load unpacked', and select the 'dist' folder."
echo ""
echo "For debugging:"
echo "- Enable debug mode in the extension popup"
echo "- Click 'Show Debug Console' to see real-time debugging information"
echo "- Click 'Analyze Feed Now' to manually trigger post analysis"
echo "- Check the browser console (F12) for detailed logs"

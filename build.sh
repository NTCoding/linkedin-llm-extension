#!/bin/bash
set -e

# Build script for LinkedIn Self-Centered Post Detector browser extension

# Display a colorful banner
echo -e "\033[1;34m"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   LinkedIn Self-Centered Post Detector - Build Script         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "\033[0m"

# Remove old build log if it exists
LOGFILE="build.log"
if [ -f "$LOGFILE" ]; then
  rm "$LOGFILE"
fi

# All output will be logged to build.log (line-buffered for real-time logging)
if command -v stdbuf &> /dev/null; then
  exec > >(stdbuf -oL tee "$LOGFILE") 2>&1
else
  exec > >(tee "$LOGFILE") 2>&1
fi

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

# SKIP ICON CONVERSION IF IT FAILS, WITH TIMEOUT
# Each svgexport command will timeout after 60 seconds

echo "Converting SVG icons to PNG (if possible, 60s timeout per icon)..."
for size in 16 48 128; do
  if [ -f "icons/icon${size}.svg" ]; then
    if command -v timeout &> /dev/null; then
      timeout 60s npx svgexport "icons/icon${size}.svg" "icons/icon${size}.png" "${size}:${size}" \
        || echo "[WARN] svgexport failed or timed out for icon${size}.svg, skipping."
    else
      echo "[ERROR] 'timeout' command not found. Please install coreutils (brew install coreutils) to provide 'timeout' on macOS." >&2
      exit 1
    fi
  else
    echo "[WARN] icons/icon${size}.svg not found, skipping."
  fi
done

# Clean up the dist directory to remove default build files
echo "Cleaning up dist directory..."
if [ -d "dist" ]; then
  # Remove all files in dist/ but keep the manifest-v2 and manifest-v3 directories
  find dist -maxdepth 1 -type f -exec rm {} \;
  # Remove any directories that are not manifest-v2 or manifest-v3
  find dist -maxdepth 1 -type d -not -name "manifest-v2" -not -name "manifest-v3" -not -name "dist" -exec rm -rf {} \;
fi

# Remove old package if it exists to avoid UsageError
PACKAGE_PATH="web-ext-artifacts/linkedin_self_centered_post_detector-1.1.0.zip"
if [ -f "$PACKAGE_PATH" ]; then
  echo "Removing old package: $PACKAGE_PATH"
  rm "$PACKAGE_PATH"
fi


echo "Building extension (manifest-v2)..."
npm run build:manifest-v2
if [ $? -ne 0 ]; then
    echo -e "\033[1;31mBuild failed for manifest-v2!\033[0m"
    exit 1
fi

# Check if the manifest-v2 build was successful
if [ ! -f "dist/manifest-v2/content.js" ]; then
    echo -e "\033[1;31mBuild failed! The dist/manifest-v2/content.js file was not created.\033[0m"
    exit 1
fi

echo "Building extension (manifest-v3 - for backward compatibility)..."
npm run build:manifest-v3
if [ $? -ne 0 ]; then
    echo -e "\033[1;31mBuild failed for manifest-v3!\033[0m"
    exit 1
fi

# Check if the manifest-v3 build was successful
if [ ! -f "dist/manifest-v3/content.js" ]; then
    echo -e "\033[1;31mBuild failed! The dist/manifest-v3/content.js file was not created.\033[0m"
    exit 1
fi


echo "Packaging extension (manifest-v2)..."
npm run package:manifest-v2 -- --overwrite-dest
if [ $? -ne 0 ]; then
    echo -e "\033[1;31mPackaging failed for manifest-v2!\033[0m"
    exit 1
fi

echo "Packaging extension (manifest-v3 - for backward compatibility)..."
npm run package:manifest-v3 -- --overwrite-dest
if [ $? -ne 0 ]; then
    echo -e "\033[1;31mPackaging failed for manifest-v3!\033[0m"
    exit 1
fi

echo -e "\033[1;32m"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   Build complete! The packaged extensions are in:             ║"
echo "║   ./web-ext-artifacts/manifest-v2/ (manifest v2 version)      ║"
echo "║   ./web-ext-artifacts/manifest-v3/ (manifest v3 version)      ║"
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

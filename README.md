**100% vibe coded.**

# LinkedIn Self-Centered Post Detector

This project is a browser extension that identifies LinkedIn posts with self-centered content that contain pictures of the author, and allows you to instantly unsubscribe from these authors.

## Features

- Automatically highlights LinkedIn posts that contain self-centered content and images
- Adds an "Unsubscribe" button to quickly unfollow authors of these posts
- Works directly in your LinkedIn feed
- Simple browser extension with an easy-to-use interface

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/yourusername/linkedin-llm-post-detector.git
   ```

2. Navigate to the project directory:

   ```sh
   cd linkedin-llm-post-detector
   ```

3. Install the dependencies:

   ```sh
   npm install
   ```

4. Build the extension:

   ```sh
   ./build.sh
   ```

   > **Note:** You should use the `build.sh` script to build the extension. This script will handle the TypeScript compilation and any additional build steps required for packaging the extension. Make sure the script is executable (`chmod +x build.sh`).

5. Load the extension in your browser:
   - For Chrome: Go to chrome://extensions/, enable "Developer mode", click "Load unpacked", and select the `dist` folder
   - For Firefox: Go to about:debugging#/runtime/this-firefox, click "Load Temporary Add-on...", and select any file in the `dist` folder
   - For Edge: Go to edge://extensions/, enable "Developer mode", click "Load unpacked", and select the `dist` folder

## Usage

1. Navigate to LinkedIn in your browser.
2. The extension will automatically highlight posts that contain self-centered content and images.
3. Click the "Unsubscribe" button on any highlighted post to unfollow that author.
4. Click the extension icon in your browser toolbar to see statistics and configure settings.

## Development

1. Clone the repository and install dependencies as described above.
2. Start the development build with watch mode:

   ```sh
   npm run watch
   ```

3. Load the extension in your browser as described in the Installation section.
4. Make changes to the source code and webpack will automatically rebuild the extension.
5. Reload the extension in your browser to see the changes.

## Debugging

The extension includes built-in debugging capabilities to help troubleshoot issues:

1. **Debug Mode**: Enable debug mode in the extension popup to see detailed logs.
2. **Debug Console**: Click "Show Debug Console" in the extension popup to open an in-page debug console that shows real-time information about post detection.
3. **Manual Analysis**: Click "Analyze Feed Now" to force the extension to scan the current LinkedIn feed for posts.
4. **Browser Console**: Open your browser's developer tools (F12) and check the console for detailed logs.

### Debug Features

- **Post Visualization**: In debug mode, the extension highlights the DOM elements being processed.
- **Selector Testing**: The extension tries multiple CSS selectors to find LinkedIn posts, with debug logs showing which selectors were successful.
- **Content Analysis**: Detailed logs show why posts are being flagged (or not) based on content and image analysis.
- **Statistics**: Track how many posts are analyzed, detected, and how many authors are unfollowed.

## Troubleshooting

If posts are not being detected:

1. Enable debug mode in the extension popup
2. Click "Analyze Feed Now" to trigger manual analysis
3. Check the debug console for any errors
4. Verify that the CSS selectors match LinkedIn's current UI
5. Ensure content script is running on LinkedIn by checking the browser console
6. Try scrolling down to load more posts and trigger the mutation observer

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
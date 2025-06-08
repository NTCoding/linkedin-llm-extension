# Debugging the LinkedIn Self-Centered Post Detector

This document provides detailed instructions for debugging the LinkedIn Self-Centered Post Detector browser extension.

## Common Issues

### Posts Not Being Detected

If the extension is not detecting self-centered posts on LinkedIn:

1. **Check CSS Selectors**: LinkedIn frequently updates their UI and CSS classes. The extension uses multiple selectors to try to find posts, but they may need to be updated.

2. **Content Script Loading**: Ensure the content script is properly loading on LinkedIn pages. Check your browser's extension console for any errors.

3. **LinkedIn Feed Loading**: The extension waits for LinkedIn's feed to load, but sometimes the timing may be off. Try scrolling down to trigger more posts to load.

4. **Network Issues**: If the extension can't access LinkedIn's API for unfollowing, check your network connection and any browser security settings.

## Debugging Tools

### Debug Mode

Enable debug mode in the extension popup to see detailed logs and visualizations:

1. Click the extension icon in your browser toolbar
2. Find the "Debug Mode" toggle in the debugging section
3. Enable the toggle

### Debug Console

The in-page debug console provides real-time debugging information:

1. Click "Show Debug Console" in the extension popup
2. A floating console will appear on the LinkedIn page
3. This console shows log messages from the post detection process
4. Use the "Clear" button to clear the logs
5. Use the "Analyze Feed" button to trigger a manual analysis

### Browser Developer Tools

For more detailed debugging:

1. Open your browser's developer tools (F12 or Right-click > Inspect)
2. Go to the "Console" tab
3. Filter for "Self-Centered" to see only the extension's logs
4. Look for any errors or warnings

## Advanced Debugging

### Inspecting DOM Elements

With debug mode enabled, the extension highlights DOM elements being processed:

1. Enable debug mode
2. The extension will highlight each post it analyzes with a purple outline
3. Open your browser's developer tools and inspect the highlighted elements
4. Check if the selectors match the expected elements

### Testing CSS Selectors

To test if your CSS selectors are working:

1. Open the developer tools console on LinkedIn
2. Run commands like:
   ```javascript
   document.querySelectorAll('.feed-shared-update-v2').length
   document.querySelectorAll('.occludable-update').length
   document.querySelectorAll('div[data-urn]').length
   ```
3. Update the selectors in `src/content.ts` if needed

### Modifying Keyword Detection

To adjust what content is considered "self-centered":

1. Edit the `selfCenteredKeywords` array in `src/llmDetector.ts`
2. Add or remove keywords as needed
3. Rebuild the extension

## Reporting Issues

When reporting issues, please include:

1. Browser name and version
2. Extension version
3. Steps to reproduce the issue
4. Any error messages from the console
5. Screenshots of the LinkedIn feed

This information will help diagnose and fix the problem more quickly.
